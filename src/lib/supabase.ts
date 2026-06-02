import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL || 'https://tevzvdpmtmwqkzogyejf.supabase.co';
const SUPABASE_ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_MJJ73DqnyNwhUeHbXHjSqQ_92rdncqI';

export let supabase: any = null;

try {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch (error) {
  console.warn('Supabase initialization failed. Local storage proxy active.', error);
}

// Interface for user
export interface UserSession {
  id: string;
  email: string;
  created_at: string;
  token?: string;
}

export interface ObfuscationRecord {
  id: string;
  user_id: string;
  original_code: string;
  obfuscated_code: string;
  preset: string;
  created_at: string;
}

// Fallback mock stores inside localStorage
const MOCK_USERS_KEY = 'minray_mock_users';
const MOCK_SESSION_KEY = 'minray_mock_session';
const MOCK_HISTORY_KEY = 'minray_mock_history';

// Custom Circuit breakers to prevent laggy network request timeouts and console noise
let isSupabaseOffline = false;
let isObfuscationTableMissing = false;
let isProfilesTableMissing = false;

const handleSupabaseError = (err: any, context?: string) => {
  if (!err) return;
  const errMsg = (err.message || String(err)).toLowerCase();
  const errCode = err.code || '';
  
  console.info(`[Supabase Status] Operation handled in '${context || 'manager'}':`, errMsg);

  // Schema cache table not found (PGRST205)
  if (errCode === 'PGRST205' || errMsg.includes('could not find') || errMsg.includes('does not exist')) {
    if (context?.includes('history') || context?.includes('record') || context?.includes('rating')) {
      isObfuscationTableMissing = true;
      console.info('[Supabase Circuit Breaker] Table "obfuscation_history" missing in database. Switched to local history storage.');
    }
    if (context?.includes('profile') || context?.includes('user_data')) {
      isProfilesTableMissing = true;
      console.info('[Supabase Circuit Breaker] Table "user_profiles" missing in database. Switched to secure local profiles.');
    }
  }

  // Network offline or failed to fetch
  if (errMsg.includes('failed to fetch') || errMsg.includes('networkerror') || errMsg.includes('cors') || errMsg.includes('load failed') || errMsg.includes('offline')) {
    isSupabaseOffline = true;
    console.info('[Supabase Circuit Breaker] Network connection unreachable (TypeError: Failed to fetch). Activating session local workspace fallback mode.');
    // Let's reset the circuit breaker after 30 seconds to allow standard network queries to retry/recover
    setTimeout(() => {
      isSupabaseOffline = false;
      console.info('[Supabase Circuit Breaker] Re-attempting connection test to remote database.');
    }, 30000);
  }
};

const isGuestUserId = (userId: string): boolean => {
  if (!userId) return true;
  return (
    userId.startsWith('local_') ||
    userId.startsWith('MR-TOK-') ||
    userId.startsWith('tab_') ||
    userId.startsWith('MRAY-')
  );
};

const cleanEmail = (rawEmail: string): string => {
  if (rawEmail.endsWith('@local.minray.io')) {
    return rawEmail.split('@')[0];
  }
  return rawEmail;
};

const getMockUsers = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem(MOCK_USERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveMockUser = (email: string, pass: string) => {
  const users = getMockUsers();
  users[email.toLowerCase().trim()] = pass;
  localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
};

export const authService = {
  async signUp(username: string, pass: string): Promise<{ user: UserSession | null; error: any }> {
    const trimmed = username.trim();
    if (!/^[a-zA-Z0-9_\-\.]{3,}$/.test(trimmed)) {
      return {
        user: null,
        error: { message: 'Username must be at least 3 characters and contain only letters, numbers, hyphens, underscores, and periods.' }
      };
    }
    if (!pass || pass.length < 6) {
      return { user: null, error: { message: 'Password must be 6+ characters.' } };
    }

    const email = `${trimmed.toLowerCase()}@local.minray.io`;

    // Check if user already exists locally first to prevent redundant Supabase calls and rates
    const users = getMockUsers();
    if (users[email]) {
      return { user: null, error: { message: 'Username already exists.' } };
    }

    try {
      if (supabase && !isSupabaseOffline) {
        // We always try to register in Supabase, but also save locally to prevent lockout on unconfirmed emails
        const { data, error } = await supabase.auth.signUp({ email, password: pass });
        saveMockUser(email, pass);
        
        if (error) {
          handleSupabaseError(error, 'auth_signup');
          console.info('Supabase signup status: using local workspace fallback session.');
        } else if (data?.user) {
          return {
            user: { id: data.user.id, email: cleanEmail(data.user.email || email), created_at: data.user.created_at },
            error: null
          };
        }
      }
    } catch (e: any) {
      handleSupabaseError(e, 'auth_signup');
      console.info('Supabase registration status: utilizing secure local session backup.');
    }

    saveMockUser(email, pass);
    const session: UserSession = {
      id: 'local_' + Math.random().toString(36).substr(2, 9),
      email: cleanEmail(email),
      created_at: new Date().toISOString()
    };
    localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(session));
    return { user: session, error: null };
  },

  async signIn(username: string, pass: string): Promise<{ user: UserSession | null; error: any }> {
    const trimmed = username.trim();
    if (!trimmed || !pass) {
      return { user: null, error: { message: 'Fields must not be blank.' } };
    }
    const email = `${trimmed.toLowerCase()}@local.minray.io`;
    let supabaseErrorMsg = '';

    try {
      if (supabase && !isSupabaseOffline) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
        if (data?.user) {
          return {
            user: { id: data.user.id, email: cleanEmail(data.user.email || email), created_at: data.user.created_at },
            error: null
          };
        }
      }
    } catch (e: any) {
      handleSupabaseError(e, 'auth_signin');
      supabaseErrorMsg = e.message || String(e);
      console.warn('Supabase signin error, utilizing local backup:', supabaseErrorMsg);
    }

    // Local Fallback Auth Verification
    const users = getMockUsers();
    const correctPass = users[email];
    if (!correctPass || correctPass !== pass) {
      if (supabaseErrorMsg.toLowerCase().includes('confirm') || supabaseErrorMsg.toLowerCase().includes('verified') || supabaseErrorMsg.toLowerCase().includes('not confirmed')) {
        return {
          user: null,
          error: { message: 'Tài khoản chưa được kích hoạt ở Supabase (Email not confirmed). Vui lòng vào Supabase Dashboard -> Authentication -> Providers -> Email -> Tắt "Confirm email" để đăng nhập bằng Username giả lập!' }
        };
      }
      return { user: null, error: { message: 'Invalid credentials. Record not found.' } };
    }

    const session: UserSession = {
      id: 'local_' + Math.random().toString(36).substr(2, 9),
      email: cleanEmail(email),
      created_at: new Date().toISOString()
    };
    localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(session));
    return { user: session, error: null };
  },

  async signOut(): Promise<{ error: any }> {
    try {
      if (supabase && !isSupabaseOffline) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      handleSupabaseError(e, 'auth_signout');
    }
    localStorage.removeItem(MOCK_SESSION_KEY);
    return { error: null };
  },

  async getSessionUser(): Promise<UserSession | null> {
    try {
      if (supabase && !isSupabaseOffline) {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) {
          return {
            id: data.session.user.id,
            email: cleanEmail(data.session.user.email || ''),
            created_at: data.session.user.created_at
          };
        }
      }
    } catch (e) {
      handleSupabaseError(e, 'get_session_user');
      console.warn('Failed to retrieve Supabase session, reading local store:', e);
    }

    try {
      const raw = localStorage.getItem(MOCK_SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
};

export const historyService = {
  async saveRecord(userId: string, original: string, obfuscated: string, preset: string): Promise<void> {
    const timestamp = new Date().toISOString();
    
    try {
      if (supabase && !isSupabaseOffline && !isObfuscationTableMissing && !userId.startsWith('local_')) {
        const { error } = await supabase.from('obfuscation_history').insert({
          user_id: userId,
          original_code: original,
          obfuscated_code: obfuscated,
          preset: preset,
          created_at: timestamp
        });
        if (!error) return;
        handleSupabaseError(error, 'save_record');
      }
    } catch (e) {
      handleSupabaseError(e, 'save_record');
    }

    // Local fallback history storing
    try {
      const records = this.getLocalRecords(userId);
      const newRecord: ObfuscationRecord = {
        id: Math.random().toString(36).substr(2, 9),
        user_id: userId,
        original_code: original,
        obfuscated_code: obfuscated,
        preset: preset,
        created_at: timestamp
      };
      records.unshift(newRecord);
      
      // Attempt safe saving in waves by decreasing capacity or stubbing if we hit browser quota limits.
      let success = false;
      let targetListSize = 15;
      
      while (!success && targetListSize > 0) {
        try {
          const slicedRecords = records.slice(0, targetListSize);
          localStorage.setItem(MOCK_HISTORY_KEY + '_' + userId, JSON.stringify(slicedRecords));
          success = true;
        } catch (storageError) {
          // If we hit storage quota, let's aggressively decrease count caps to salvage the save
          if (targetListSize > 8) {
            targetListSize = 8;
          } else if (targetListSize > 4) {
            targetListSize = 4;
          } else if (targetListSize > 2) {
            targetListSize = 2;
          } else if (targetListSize > 1) {
            targetListSize = 1;
          } else {
            // Even a single item exceeds quota! Let's prune and stub code bodies to fit.
            try {
              const prunedRecord = { ...records[0] };
              prunedRecord.original_code = `-- [Original source pruned to save offline space. Size: ${(original.length / 1024).toFixed(1)} KB]`;
              prunedRecord.obfuscated_code = `-- [Obfuscated output pruned to save offline space. Size: ${(obfuscated.length / 1024).toFixed(1)} KB]`;
              localStorage.setItem(MOCK_HISTORY_KEY + '_' + userId, JSON.stringify([prunedRecord]));
            } catch (innerErr) {
              console.warn('Failed even saving minimal stub record:', innerErr);
            }
            break;
          }
        }
      }

      // Proactive Optimization: If list exceeds 500KB of characters, let's stub codes of older history items.
      if (success && targetListSize > 1) {
        const storedKey = MOCK_HISTORY_KEY + '_' + userId;
        const currentRaw = localStorage.getItem(storedKey) || '[]';
        if (currentRaw.length > 500000) {
          try {
            const parsed = JSON.parse(currentRaw);
            // Stub the code body of older records to save storage space
            for (let i = 1; i < parsed.length; i++) {
              if (parsed[i].original_code && parsed[i].original_code.length > 2000) {
                parsed[i].original_code = `-- [Purged from local history to stay under offline size limits. Original size: ${(parsed[i].original_code.length / 1024).toFixed(1)} KB]`;
              }
              if (parsed[i].obfuscated_code && parsed[i].obfuscated_code.length > 2000) {
                parsed[i].obfuscated_code = `-- [Purged from local history to stay under offline size limits. Output size: ${(parsed[i].obfuscated_code.length / 1024).toFixed(1)} KB]`;
              }
            }
            localStorage.setItem(storedKey, JSON.stringify(parsed));
          } catch {}
        }
      }
    } catch (e) {
      console.warn('Fallback error during local history write sequence:', e);
    }
  },

  getLocalRecords(userId: string): ObfuscationRecord[] {
    try {
      const raw = localStorage.getItem(MOCK_HISTORY_KEY + '_' + userId);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  async getRecords(userId: string): Promise<ObfuscationRecord[]> {
    try {
      if (supabase && !isSupabaseOffline && !isObfuscationTableMissing && !userId.startsWith('local_')) {
        const { data, error } = await supabase
          .from('obfuscation_history')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10);
        if (!error && data) return data;
        if (error) {
          handleSupabaseError(error, 'get_records');
        }
      }
    } catch (e) {
      handleSupabaseError(e, 'get_records');
      console.warn('Failed fetching from Supabase database table, loading local archives:', e);
    }

    return this.getLocalRecords(userId);
  }
};

export interface UserDataPayload {
  credits: number;
  tabs: Array<{ id: string; name: string; inputCode: string; outputCode: string }>;
  recoveryToken: string;
  activeApiKey?: string | null;
  activePlanType?: string | null;
  planExpiresAt?: string | null;
  planDelaySecs?: number;
}

export const userDataService = {
  async saveUserData(userIdOrToken: string, payload: UserDataPayload): Promise<void> {
    if (!supabase || !userIdOrToken) return;

    const isLocal = userIdOrToken.startsWith('local_') || userIdOrToken.startsWith('MR-TOK-') || userIdOrToken.startsWith('tab_') || userIdOrToken.startsWith('MRAY-');
    const timestamp = new Date().toISOString();

    // 1. Try to upsert into user_profiles table (great for both guest token and logged-in users if user_profiles table is created)
    if (!isSupabaseOffline && !isProfilesTableMissing) {
      try {
        const { error } = await supabase
          .from('user_profiles')
          .upsert({
            id: userIdOrToken,
            credits: payload.credits,
            tabs: JSON.stringify(payload.tabs),
            recovery_token: payload.recoveryToken,
            updated_at: timestamp
          }, { onConflict: 'id' });
        
        if (!error) {
          console.log('Saved to user_profiles table successfully.');
        } else {
          handleSupabaseError(error, 'save_user_data_profile');
        }
      } catch (e) {
        handleSupabaseError(e, 'save_user_data_profile');
      }
    }

    // 2. Fallback: If the user is authenticated (not local_ guest), we can update raw_user_meta_data
    if (!isLocal && !isSupabaseOffline) {
      try {
        const { error } = await supabase.auth.updateUser({
          data: {
            credits: payload.credits,
            tabs: payload.tabs,
            recovery_token: payload.recoveryToken,
            activeApiKey: payload.activeApiKey,
            activePlanType: payload.activePlanType,
            planExpiresAt: payload.planExpiresAt,
            planDelaySecs: payload.planDelaySecs
          }
        });
        if (!error) {
          console.log('Saved to Auth raw_user_meta_data successfully.');
        } else {
          handleSupabaseError(error, 'save_user_data_auth');
        }
      } catch (authErr) {
        handleSupabaseError(authErr, 'save_user_data_auth');
        console.warn('Failed saving to user metadata: ', authErr);
      }
    }

    // Always fallback to saving inside obfuscation_history as a special config row for both local/cloud authentication states
    if (!isSupabaseOffline && !isObfuscationTableMissing) {
      try {
        // Delete any previous config rows first
        await supabase
          .from('obfuscation_history')
          .delete()
          .eq('user_id', userIdOrToken)
          .eq('preset', 'user_data_config');

        // Insert new config row
        const { error } = await supabase.from('obfuscation_history').insert({
          user_id: userIdOrToken,
          preset: 'user_data_config',
          original_code: JSON.stringify(payload.tabs),
          obfuscated_code: JSON.stringify({
            credits: payload.credits,
            recoveryToken: payload.recoveryToken,
            activeApiKey: payload.activeApiKey,
            activePlanType: payload.activePlanType,
            planExpiresAt: payload.planExpiresAt,
            planDelaySecs: payload.planDelaySecs
          }),
          created_at: timestamp
        });
        if (error) {
          handleSupabaseError(error, 'save_user_data_history');
        }
      } catch (histErr) {
        handleSupabaseError(histErr, 'save_user_data_history');
        console.warn('Failed saving config row to obfuscation_history:', histErr);
      }
    }
  },

  async loadUserData(userIdOrToken: string): Promise<UserDataPayload | null> {
    if (!supabase || !userIdOrToken) return null;

    const isLocal = userIdOrToken.startsWith('local_') || userIdOrToken.startsWith('MR-TOK-') || userIdOrToken.startsWith('tab_') || userIdOrToken.startsWith('MRAY-');

    // 1. Try reading from user_profiles table first
    if (!isSupabaseOffline && !isProfilesTableMissing) {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userIdOrToken)
          .maybeSingle();

        if (error) {
          handleSupabaseError(error, 'load_user_data_profile');
        } else if (data) {
          let tabs = [];
          try {
            tabs = typeof data.tabs === 'string' ? JSON.parse(data.tabs) : data.tabs;
          } catch {
            tabs = data.tabs;
          }
          return {
            credits: data.credits ?? 10,
            tabs: Array.isArray(tabs) ? tabs : [],
            recoveryToken: data.recovery_token || ''
          };
        }
      } catch (e) {
        handleSupabaseError(e, 'load_user_data_profile');
      }
    }

    // 2. Fallback: If logged in, check Auth session user_metadata
    if (!isLocal && !isSupabaseOffline) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const meta = session?.user?.user_metadata;
        if (meta && typeof meta.credits === 'number') {
          return {
            credits: meta.credits,
            tabs: Array.isArray(meta.tabs) ? meta.tabs : [],
            recoveryToken: meta.recovery_token || '',
            activeApiKey: meta.activeApiKey || null,
            activePlanType: meta.activePlanType || null,
            planExpiresAt: meta.planExpiresAt || null,
            planDelaySecs: meta.planDelaySecs ?? 0
          };
        }
      } catch (authErr) {
        handleSupabaseError(authErr, 'load_user_data_auth');
        console.warn('Failed loading from user metadata:', authErr);
      }
    }

    // Fallback: Check obfuscation_history for special config row
    if (!isSupabaseOffline && !isObfuscationTableMissing) {
      try {
        const { data, error } = await supabase
          .from('obfuscation_history')
          .select('*')
          .eq('user_id', userIdOrToken)
          .eq('preset', 'user_data_config')
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          handleSupabaseError(error, 'load_user_data_history');
        } else if (data && data.length > 0) {
          const row = data[0];
          let tabs = [];
          let credits = 10;
          let recoveryToken = '';
          let activeApiKey = null;
          let activePlanType = null;
          let planExpiresAt = null;
          let planDelaySecs = 0;

          try {
            tabs = JSON.parse(row.original_code);
          } catch {}
          try {
            const parsedMeta = JSON.parse(row.obfuscated_code);
            credits = parsedMeta.credits ?? 10;
            recoveryToken = parsedMeta.recoveryToken ?? '';
            activeApiKey = parsedMeta.activeApiKey ?? null;
            activePlanType = parsedMeta.activePlanType ?? null;
            planExpiresAt = parsedMeta.planExpiresAt ?? null;
            planDelaySecs = parsedMeta.planDelaySecs ?? 0;
          } catch {}

          return {
            credits,
            tabs,
            recoveryToken,
            activeApiKey,
            activePlanType,
            planExpiresAt,
            planDelaySecs
          };
        }
      } catch (histErr) {
        handleSupabaseError(histErr, 'load_user_data_history');
        console.warn('Failed loading from obfuscation_history config:', histErr);
      }
    }

    return null;
  },

  async checkApiKey(apiKey: string): Promise<UserDataPayload | null> {
    if (!apiKey) return null;
    const trimmedKey = apiKey.trim();

    // 1. Try checking obfuscation_history first where preset = 'user_data_config'
    if (supabase && !isSupabaseOffline && !isObfuscationTableMissing) {
      try {
        const { data, error } = await supabase
          .from('obfuscation_history')
          .select('*')
          .eq('preset', 'user_data_config');
        
        if (!error && data) {
          for (const row of data) {
            try {
              const parsedMeta = JSON.parse(row.obfuscated_code);
              if (parsedMeta && parsedMeta.activeApiKey === trimmedKey) {
                let tabs = [];
                try {
                  tabs = JSON.parse(row.original_code);
                } catch {}

                return {
                  credits: parsedMeta.credits ?? 10,
                  tabs: Array.isArray(tabs) ? tabs : [],
                  recoveryToken: parsedMeta.recoveryToken || row.user_id,
                  activeApiKey: parsedMeta.activeApiKey,
                  activePlanType: parsedMeta.activePlanType,
                  planExpiresAt: parsedMeta.planExpiresAt,
                  planDelaySecs: parsedMeta.planDelaySecs ?? 0
                };
              }
            } catch {}
          }
        }
      } catch (e) {
        handleSupabaseError(e, 'check_api_key_history');
      }
    }

    // 2. Also check if the current user has it locally
    const localKey = localStorage.getItem("minray_api_key");
    if (localKey && localKey.trim() === trimmedKey) {
      const localPlan = localStorage.getItem("minray_plan_type");
      const localExpiry = localStorage.getItem("minray_plan_expires_at");
      const localDelay = localStorage.getItem("minray_plan_delay_secs");
      const localCredits = localStorage.getItem("minray_credits");
      const localRec = localStorage.getItem("minray_recovery_token") || "";

      return {
        credits: localCredits ? parseInt(localCredits, 10) : 10,
        tabs: [],
        recoveryToken: localRec,
        activeApiKey: localKey,
        activePlanType: localPlan,
        planExpiresAt: localExpiry,
        planDelaySecs: localDelay ? parseInt(localDelay, 10) : 0
      };
    }

    return null;
  }
};

export interface RatingRecord {
  id: string;
  fingerprint: string;
  rating: number;
  comment: string;
  created_at: string;
  email?: string;
}

export const ratingService = {
  async submitRating(fingerprint: string, rating: number, comment: string, email?: string): Promise<boolean> {
    const timestamp = new Date().toISOString();
    const id = 'rate_' + Math.random().toString(36).substr(2, 9);
    
    // Store localized state so fingerprint check is client-enforced
    try {
      localStorage.setItem('minray_last_rated', 'true');
      localStorage.setItem('minray_rate_score', rating.toString());
      localStorage.setItem('minray_rate_comment', comment);
    } catch {}
    
    try {
      if (supabase && !isSupabaseOffline && !isObfuscationTableMissing) {
        const { error } = await supabase.from('obfuscation_history').insert({
          user_id: fingerprint,
          preset: 'user_rating_record',
          original_code: comment || '',
          obfuscated_code: JSON.stringify({ rating, email }),
          created_at: timestamp
        });
        if (!error) return true;
        handleSupabaseError(error, 'submit_rating');
      }
    } catch (e) {
      handleSupabaseError(e, 'submit_rating');
      console.warn('Failed saving rating to Supabase, falling back locally', e);
    }

    // fallback to local storage
    try {
      const raw = localStorage.getItem('minray_local_ratings') || '[]';
      const list = JSON.parse(raw);
      list.push({ id, fingerprint, rating, comment, created_at: timestamp, email });
      localStorage.setItem('minray_local_ratings', JSON.stringify(list));
    } catch {}
    return true;
  },

  async getAllRatings(): Promise<RatingRecord[]> {
    try {
      if (supabase && !isSupabaseOffline && !isObfuscationTableMissing) {
        const { data, error } = await supabase
          .from('obfuscation_history')
          .select('*')
          .eq('preset', 'user_rating_record')
          .order('created_at', { ascending: false });
          
        if (error) {
          handleSupabaseError(error, 'get_all_ratings');
        } else if (data) {
          return data.map((row: any) => {
            let rating = 5;
            let email = '';
            try {
              const meta = JSON.parse(row.obfuscated_code);
              rating = meta.rating ?? 5;
              email = meta.email ?? '';
            } catch {}
            return {
              id: row.id || ('r_' + Math.random().toString(36).substr(2, 5)),
              fingerprint: row.user_id,
              rating,
              comment: row.original_code || '',
              created_at: row.created_at,
              email
            };
          });
        }
      }
    } catch (e) {
      handleSupabaseError(e, 'get_all_ratings');
      console.warn('Could not load ratings from database, using fallback', e);
    }

    try {
      const raw = localStorage.getItem('minray_local_ratings') || '[]';
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
};

