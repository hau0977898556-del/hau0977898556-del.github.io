local string = string
local unpack = unpack or table.unpack
local G, v, u, N, Q, _sub = {}, string.gsub, string.char, string.byte, string.pack, string.sub;
for Q=0,255 do G[Q]=u(Q);end;
local K = 5;

G=function(m)
  m=_sub(m,K);
  m=v(m,"z","!!!!!");
  return v(m,".....",function(c)
    local z,m,W,O,h=N(c,1,5);
    local V=((h-33)+(O-33)*85+(W-33)*7225+(m-33)*614125+(z-33)*52200625) % 4294967296;
    return Q("<I4",V);
  end);
end;

local z={[0]=1,2,4,8,16,32,64,128,256,512,1024,2048,4096,8192,16384,32768,65536,131072,262144,524288,1048576,2097152,4194304,8388608,16777216,33554432,67108864,134217728,268435456,536870912,1073741824,2147483648,4294967296};

local m=function(W,expectedSize)
  W=_sub(W,14);
  local O,h,V_,L=0,0,0xFFFFFFFF,#W;
  local r=function()O=O+1;return N(W,O,O) or 0;end;
  local N=0;
  for W=1,5 do N=N*256+r();end;
  local function W(X)local x=0;for _=X,1,-1.0 do V_=V_/2;V_=V_-V_%1;x=x*2;if not(N<V_)then N=N-V_;x=x+1;end;if V_<=0x00FFFFFF then V_=V_*256;N=N*256+r();end;end;return x;end;
  local X,x={[0]=0},"";
  local function _(t,Z)local g,T,o=V_/2048,t[Z];g=g-g%1;local s=g*T;if N<s then V_=s;g=(2048-T)/32;g=g-g%1;T=T+g;o=0;else V_=V_-s;N=N-s;local g=T/32;g=g-g%1;T=T-g;o=1;end;t[Z]=T;if V_<=0x00FFFFFF then V_=V_*256;N=N*256+r();end;return o;end;
  local N={[0]=0,0,0,0,1,2,3,4,5,6,4,5};
  local function K_(r,t,Z)local g=1;for T=1,t do g=g*2+_(Z,g);end;return(g-r);end;
  local function r(t,Z,g)local T,o=0,1;for s=0,t-1 do local t=_(g,Z+o);o=o*2+t;T=T+t*z[s];end;return T;end;
  local function t(Z,g)local T=1;for o=7,0,-1 do local s=(Z/z[o])%2;s=s-s%1;local o=_(g,T+(s*256)+256);T=T*2+o;if s~=o then while T<0x100 do T=T*2+_(g,T);end;break;end;end;return(T%256);end;
  local Z=0;
  local function g(T,o)if _(o,1)==0 then return K_(8,3,o[3][T]);elseif _(o,2)==0 then return 8+K_(8,3,o[4][T]);end;return K_(256,8,o[5])+16.0;end;
  local function T(o)local s={};for q=0,o-1 do s[q]=1024.0;end;return s;end;
  local function o(s,q)local J={};for y=0,s-1 do local s={};J[y]=s;for y=0,q-1 do s[y]=1024.0;end;end;return J;end;
  local function s()return{1024.0,1024.0,o(4,8),o(4,8),T(256)};end;
  local function q()
    local J,y,F,n,U,A,H,R,l,c,E,B,k,C,D,Y=o(8,0x300),0,0,o(12,4),T(12),T(12),T(12),0,T(12),o(12,4),o(4,64),T(115.0),T(16),s(),s(),0;
    while Z<expectedSize do
      local O=(Z%4);
      if _(n[h],O)==0 then
        local L=X[Z];
        local T=L/z[5.0];
        T=T-T%1;
        L=J[T];
        Z=Z+1;
        X[Z]=h<7 and K_(256,8,L)or t(X[Z-Y-1],L);
        h=N[h];
      else
        local p;
        if _(U,h)~=0 then
          if _(A,h)==0 then
            if _(c[h],O)==0 then
              h=h<7 and 9 or 11;
              p=1;
            end;
          else
            local L;
            if _(H,h)==0 then
              L=F;
            else
              if _(l,h)==0 then
                L=R;
              else
                L=y;
                y=R;
              end;
              R=F;
            end;
            F=Y;
            Y=L;
          end;
          if not p then
            h=h<7 and 8 or 11;
            p=2+g(O,D);
          end;
        else
          y=R;
          R=F;
          F=Y;
          p=2+g(O,C);
          local O=p-2;
          if 4<=O then O=3.0;end;
          Y=K_(64,6,E[O]);
          if Y>=4 then
            O=Y;
            local V=O/2-1;
            V=V-V%1;
            Y=(2+O%2)*z[V];
            if O<14 then
              Y=Y+r(V,Y-O,B);
            else
              Y=Y+(W(V-4)*16)+r(4,0,k);
              if Y==0xFFFFFFFF then return p==2;end;
            end;
          end;
          h=h<7 and 7 or 10;
          if Y>=Z then return false;end;
        end;
        local z=Z+p;
        for w=Z+1,z do X[w]=X[w-Y-1];end;
        Z=z;
      end;
    end;
    return false;
  end;
  q();
  local q_len=#X;
  local out = ""
  for w=1,q_len,7997 do
    local z_idx=w+7996.0;if z_idx>q_len then z_idx=q_len;end;
    out=out..u(unpack(X,w,z_idx));
  end;
  return out;
end;

local b85_K = [===[MRAY!<<+*!"*?=!!!!!)`@Zr47A-L<E"rhGT1"KoJNcKE+Xk"dJRq&/Hh-=p^L7@k4e#Qc.MCVM[)>M_MRjXUh>$X-B/bH3a$9m.?>[':N5d=_OE%4:IBg\mR-nn"<9+m!_VT9ni;!2:sV<6h>M#m640$,>)*#IF4L"e/d0aHhh&X.74,%u'kp^^]It``[uk<(9AEQ]9^R-SV;eNeFh<&j`*fK,s&<a`>;_g/c3L0O/X9.!_<J-iaSo\=-'d9(f0<$m!f0T#QTMQd1ajaI1D+eQSD&J5W&s]qBdg%ekIo[P2`,cXQ;lAN._:D<"!]N^$#Ya9H2`Ni/Tu5WG[J8,1TsY<CQ9M9LJUG1`%OYOJk%!aF<D4-<TejuF-lt7U1KD%"ZGb*hu(O&\F!\AX,mB9?"8r]M>(u/B'U<6#P2oJFee/#,/q:2B$.DQ,l=hcr7`'CSLDCXQhr#(Q94*-[R.+#(YO-27NB:c(mZT`dnK[$P$>/QR@->$rh^0<CQ<FF%O>Q7)Tltq(l%t+<*8,SFfN(QiCL3>qi$8K!/g2OCWg7$#SD.CEFt+j#R$+7JZ6\.(.:/J4*&*1M^[;YEj<0@8+MblY?Cp]b=!HUeaBX]?Q_=g91\a"&4Wqq\.Z#ud[SImYn/;@4T1OC=s6Hqm>R:S2fme5LMe1OX^<9>765B`d?'L\3!ibg`1-9:"$o&h.Fo-D#6H=U,WF9Z\aRPh>5h0bL31IcQ]Z>\RHUGlHfOuUtcLl*KM0*fFbasT*hIFg8PhaS2*_.Uj4JQYL"Dk_?D0Ik2.7V`V39f%lK[q;O@3d,44jl,!<@l,F5!\1f^L]=d,iW#uaKrY^eKKoUhW^Pe9LUaaT*k-Ld"KQuEBVb]R=%T;5VRPtLQ@PT&%T4gQLGA9=hYe%YPZ_Or"Q\?T?Y.,@r<ef%,p;8NcR"M3G8_f'QsdYnRM`iJ`)CB;ab;($Oa$.&1s*J45\sYmT;57?l>'=1&'[<W+O>0(+m^t+ltf7)"@fokcpZcSP/-fQ4Y.%;Fts"NGPqc=<.[a'hWXZ_?V@]a]Mu(<J0CBD<K$*@V3dRb00qF8B^QoR[=]ie]aRr4OGPMS:*dj7B$LjcGf%#E=a-`r>lnqU(MmLCYlqW)oet;d#P!A6d)Au:a#K$3bCdWRa'F#YX2>jU(K\5"F$-0"hIbtMU1'CVTI(=RiPrm<#rP1\<tBB`JPln^mG?e\,j`Z[Ypm60<,#E,?Jh"q`]>)a-CKW.?3"G[Uh_inOE8Cg#bLm5.F;kn-5F^M]?hq^+U3AZ>,am<+@GPYW8@b&%#`o1&#_.^,a3XFnkg4'@4L^^0PCtiaIus*S3BNe2"5/.SriFj\7FR"M#j@<4N`n#A9ic.B(>B'dO/[n5(EhH:c@^d*"TK)d_qY)kK_Bq*[_%qO<n/>Zj?BUKW5QllGI\X!!6-1=]j47`*IN5Gu2MK00Q]<?):TDdu]!!!>p]===]
local b85_IU = [=[MRAY!<<+*!=hm*!!!!!)`@Zr47A-Lc[087T2SbN*j%>%R!%M8ntn+<cAmIj=c'uu`:;#dZ+,%NArn9eVaPo$W+r,`FQZ'rgU*)B5B8'_eq;n,A+n%3Lb7<-?);m\JHprl2YjV9Mk$si4D6H7dmQ<.(8L)B<;R1a>17-h6:h$b_WF9r4B.]0S1<%+1d3;ik8@?fSc28X6o;4ihDr4jpO+(dJn?OGK!d?/Ck%X2?"VN8]9Z8-WAt1Z0nb;2Z#E=Vi]PO:X&&J)3UN*YPZnGT`@m(BnXKdC<6VgD#BmuopDK#m,fX:q/9G$4Eu)'#=E<b1/->3$75Q(&IuNO=`F!bd9j=/i2idO6JNDC"DG\ms2s-U,mBm`TqTgmu9@:MU<_^ku)G?sj.]Xtn(%,3D[f!,l=PS:"IOcPeG9Ta@#(-.]F6<j.:ohlYj%9@4%i=&JLokIXM2!3(VL271kd/ZSk6%cSfptSMStsILq<=L92FY`'`F9C<)p-=+Jql>5hupcq3`AYM$(F.^er7uf0hQc%7IQkrH/<W4%MDaZ5*+cmOj/)9dJcn^r/)#uU!8ukf5^O!`JVQh3lKJZ[@nu<%0@C7ZYp1^/$<4I@F,O-1CA.F\N!5$'VFO*cTc8uOE.1mIV-9n)Z\YFXoQiHP+/9AT19lCc&&67R7r6eR`P/mf'QPRFIit(YL4A"6;<SFqt$1`])BP#Wl?'FE#6Aqjb_Gd5cTa<AYC"#mQB+UpNJb*dW6N0DCWbF4%ciS!D-dCo[gRNb^G4",cEmV8:9@KKA`pSX2e[oreo&=Ok*U8m=PDo:)I1n1MelmaFV)]2PI^U`UH&rehDm:qrYcZdJYa7-V'#)\<%*`Kf+'4Je`#3?eq4:rUig#r1bOIhjt+fWPj"'\176NcRJkU07@>2LZ0<HrFa6S4A>-474<R*3=8"d4B8Ko5&SOVFTorG"qukbg@bUH\pTJr]LEKLEomdd9'4<ZNl]-t/]oBR`]_7cc:9&&F;UKSn&TAf+g52h&I@a;!Vs@-poq6KEjZ>W$oL@HmoOI6"`n(.2`pRl@Wk9fQ2[X1K`GEuZ%i8Q(oQPrfZpJ@[^rlnWK9NT9IV4_'hgSumQ;=rrnkq=P[1cr?&sW\\ImHSo,!qMTCUJ<Gbks-KCVcX@"KF,q0fJdSX^'(>diJ)32qC8SsuCCoRDGkJm?.]sMJ3RmC4Ki1jNQck8m)YQrUbiKg?F7&(`B4b@5^Ia>(8=?h,UR[f[p<Tg8rVsMe[IC<tU1"T^/+V[9TcttWVik8TUgn*a3?hQAn8@"fiH$gT*\reTR6bsVA9!e?!HLXicuMfMWqCW(ClRs';V(2%*0Q@`$amEq/PQb9a!`kjBECGAZ4P#DR%]MtFa\*7g+K.SXO:JAja=@1VSfMlRDNc]9TX%qK\Rg16EhEj;,ig:c]jeF`/YI,21lXFc<9*S>+H;-WhJ`bg8$W0&q`qK*K=I^S`0DlJF8?bEq:WKA9=Ku^(:#\\N.15X0)2+F$d-0LidK2TlS:]$2YLK)dHGq4QF(m]p\Um'2AQffQF!DEt=>BYt-[u6o^F1!H97@TD$@r9\pkK:%V\b?D*b@;PZc,2!p,faJ3Q5KQqDs^[a>HK.$'j27&2[p,.bOO,9Ih_cg=2IR(?Zi+M>_5*sY^lrfR7A)^T#\SUfe<TC[h!PF-%Vc#(INdBOca9sX>;?oc]q%VL1=i^=1?=l4g25Rjg?'o=%E;E8R%B6Em0,R(I67'%j@a,1nW)S?lF_#EQ-pUOQ-NS"LOZBn:[W('C;`icK$`u#Ro"O_!pn4U<Rl5ah`p2L)*JWFU`;RoGgSK+f:`e!VBh?^&%#F.CnWY%JJ<u!LL)`+gZU=nWne^L*j$tm#qL\A`eUb6W;6C6K$@sqOQ_SD[IPT2(CtsOAN@(b8l%5+ZtY&V`m#;_TZjf9K[[s9)a).U1=6sdB2BQlj(BMMUTg;=C%sSAKK`[uPf;8^V`1g5CEQC(I;LbSKRofdncn`Z#^u.HUkl5\)6.cE/O?tIJD:220oG^$`F?VnG4?`DOK8k-U4GtK9j\Ih"UW:$MeS`+YD4<Ks6_#/gVsJQEc7D,\Zt!G/ccPr)B^tl,RDK=aNp!'-F1/>]+($[;hZlDMEET&m$F'AU.60V[V-s-d*`"#q%,/@AT\2+p@F/mg.F1V44GXBCp:N7gL@6L+3DHQ^&M935F=%9f0&U@jG<Wg_W.XVluf$BAnAGB;@l==#T/D:('^)U4r)A/-Lsi,nc3WH0$-e>\CgAb%^n$1$F//i.tqI\Hd#4cHP8LfrAh?YPa-EKf=1SkRJpACVq9Un*PkYTVk9L3p8SMgq`<k\\n](]%JU"3X1"sb@-N*VG#Wk#->oa`oqiL*:^6d^XLcH+SO"G%Aj,[b]_!?to>IZ/##]TL<O_E,[=060A>>%.;r&A*90YTpKbOF%&$B_eDS(iEj[!cD#eW/.M1Ij;,^m's"a0h/(n>;O6%j%t[Op-(iK?CG_ZNMEI*U8+q7i(LRVQ</1?M1n9Z$OB2)i)$eQ)Lg"G4mW"S>?0f-ahL]u\MB1ucM)$m`LG?U0Okr^D[B&t!i1h>u=^S"a]P;9Kf[c7q9<qs<Y*Y)&[XTQW<&[!2fYI@DpqG)gct%p\%N(3i99K`3?)^On(PIp?OIC?iI'diiQ0@@`7YeQ5/rUT/2q-N7fKcaa]5?/JiHdC$\j4<fS*XmTN3/;=oSd^TKE,a[A+aeK>FXITY^F(=,%V_mREUQ;epaLB=4U:RGf+bB<:RBG4S)qNH$.2+i^&nE>sVudFcCt-)799(7do'P$EB3qjYd+sVnP9gTRm6+b^<iM$kdCY5(QkFt8o>;E4Ef)aO>gPSg`A)r>02<44hU(.UB^.:7XYC$*Q>5+MF^Tab.Qinh-M(J'[[#DKfr_m=/[tX$W5ti2N<#K6]g/;Z,p@[(?C*.4=@c]Ck_e]0aa9M?KOcKWaHE;2B8`uV^^.+Qh)4HBkt>;_Mj['@SfS1R:h`cP0s9o3BtfSk#2=,g[W%*@+(*>hHM!+Bclsk\\C42D![E7><K*N7=p^K421==67qM'aZA_ch6?1%NG5[EUa`frWe+r"m-Q>oU$KP#h`+S$:"'3!aC>Vb:A9Mq(!Q+=3q#")QPl[I+V7U$(In#gO,;j!f2[>k$iD)AU;!4JdH-=^N&D$&==7DFW8<A\(H#=-#r#KS>SF.In$<qBhPoXbd5Ho9^_Ot2Ain,1(91?6\LP&aQm%:M:YdDq*NblU%%X6U'6D<(3.V./)I^<^NUqF(R2Q[;*]+):R'V\<m+*^u\M\D2/j2R`5cu#LeQ"8Q-ioTNmLiuZU;r>#F>VP27Z#m/6-@6L.>iZ:GRuL=#$<AU$]JfAeZQ/MKfD;ejTQV%d-JT#A%sl,=(3^+0CHPs/pgNPT:@_0I>TbUcWg3TY1T`5VX+G#^BTWRRRK!c$f[u?d+k7p-\&+<ocD)>nWM!P!`.!0LX0DE0tplu4[)9GR47tg3Ni1,OhY(cT<8RbCFP+]reqmLQ/d)K=t'.807tc6Y,&DG9^iXm_FIPQ]f?3F2h)5soJb_#ohr`RJJVn$([?AVZ/NIB'14n8l#+g]N@u;YkaFf9.dSE76q?9VT!d)tft`UXkp.#hKB#^gII:(u:%T[L;;A=a.o_KIK>CuN^C'c,TA0U#''Crp5:8TmC%@MND)hq+4t$!dJb;6r^5Tc"Bi+Th%tSd"N<(1Y;Jj4lM0$qgAO?C>1mCU?jb7Su,OL5XB(4c\i,=MVp*A+lmJd33Ki!%:I1EMp8g4r7h"7Wp_=R:T^F+lpfD]U@mZ>,Em/FaUXt*(#m:;/E0l;_D_&4ZT3!Y/i"0LqLUiqM@q5)4gno4XM23QUhVh!m?:jPm6P'ZRQlh8.LZiE%6!fqKSY.`<.+.;&lo^q?U[`#&*<0gBpq)Y*'QobDdT:M0+dKulAS'fi_4.5#CGf<3uU*"V]9Cg0/+Meq,.&.R?Ott0&2(#Dmn6GLqqm!-IY.7'H%5uua4A+*q@W^+&Idh3#`q8c`1Yct")"L($oBh$Lo3@M$]GDmGrII[.o6?`AX7UJg>ZJ=Qj\>'=q_C\sauk%L"f:rB@#PYeOi"5YE`>4kZtbWu!>6qL&7^7XTF^EJXFq=(X_ZNaH&RVY'CeU8j;0dCR/Vl/"YTfWe.K*#'/1n@'3%Wg;rS<MT5S%UM[JCjqW1.iQCC?l-RsJQ;Z5BkIn6j7m%ORT6#sC\MQT%,&2>;)KaPTR[+\OX#q+'b14e1d`\"m4MK>h]2^.U$OTV;QH=0f*"]n"5FW>c<5g.G@8kIoX%eep&+Slu$]<Q?J4)H5R+)ss1ID$1m4S*hA3jI"N6JG'IgoILuErMYu,*m#I)?0<+BM=e_kcZ_Se$sV$>FOBL(UB1).GhrjSlC.4$>@S\.+N5,@,.46r;j9R#1Lt0)Ja;Get['S#WD7"qcl!ofJBq89<0[EH='AXgKD]4'KI5<P(3+;"+:1Of3'^7gVT_cT/B@pZQ\B6hR7o6'L]c+#Gg1O*eHoe@VbL\16=r"o>K0cSa,@&Up:`CFk36Ch;gO')2&X"*%Ma%(g;dU:_++ZoQ4I2F1"U&oRCWMGP#_LQi8IO&M$OL=oQcGLs#e.i7@QIcC'Nn!4MG3#krf-&CRssmR5QQN#%P&$4j35Z4Ff?AA`FnOOkZG[M^HW*D'"R2dQJ)dSKb2`_3lXJ,%`WX%gOF"[JQ\XdqY>cR`U5*pr`t48In#<IE,@Ti"Ld";0T?=!ZoQlu[.TQV'f[?PbmH/)T=[42rXcR*0L>'oUB^RA.Bl''KDIF!mRbAJ1bBq@fI!]IbZ3^,A8NWLq*-3p"T_gi54:\DgumBnr4>gNS\o6o*3BReMD4=?Oo9+XQ95%20YGSZc"m"''W/L:sDHqR<+oJI6290aD6)]#nKuV$P?D+^M\9!q0?NLHrnKRlu#[`iRaHOeG\Yqb5HOV@$3nDm9dQo7B#Ag;Kg-SA`AYi5Tu$k"sOo?<YJo;G"ZtK;I,u18]c`J;V3Xm$CH)fia=D:J8^P1VSYrQ1&<!e.@4?!C>B-`ePq\gI8iX(^a"h?+nUlS!b2=(KEgXg/iup202iY1'ng/a/qgU/1Y*61DDCDLE30FBWP`uc+\Lf1PaVQ&h\^l%%;7E.URKr>ilD,401@5gecijGf5SX0CU'QQ%k?>Td_hJ6.-QAb.Dk1'%dF#4Ge<M[QHraIm_'KTLE8cbC#9e34@;k>8c'h7seE$+%W7qc[JQ<8[?jk63Qa>[1A9-r*Ah)o`3CQ_Co65"p::H)@3qOhrFF#""WNb$&+L`Ls_5T%fd8(**)6K`l0h)4So.r7l[!0'X`gSAXoiE8#d3pT"I7r%eOY:BFQoBBmgJ/\`W)+)>O?dVOe<[f8+7D\U#><cTDdYp%[4NfOPa?;nFTBo8^PP%0(5P%?m5,dLE8dG`^6ME'2>B!Mrr:0D`(/hRPt-h+_3Z\d^\tJ.8-<YaEn&!Qm\3V69"Xbh81]V.4bh$Q%foS`QYuA"!PMJ'n@")83>.-R%WJ>:Q5F,<;'N+]0=(rUcN2!q7f_0rPD^/f*-+5Z-*jOe&`ZGaHe5lo1R!b$Qmh"TCnWFWd,<GSjuBaWr!C7)d^P#(=>9ZE?qSkAbBV&e8o=2LWiWAIOU:Xb!IJ^BFt`@p=@H->Ns;Y\cVh'^PMsZQL!D4Og+ZP`u/G\H.6)[/T8erDmZ;FHft8B6eQrbr2oR,IkZpfmCp!eIlR(%E=oU<00R3*f2?`j3+r)Vcr6hM(nm9H=g)2Q_*3%(O\,\^L4e8$!1Z1FSiEBK>(3q\c\c:HQu$!6p\H[>`sY<j/W;X<h$fh*#6'k91'(-LU5,mL2#DP2KKA*g1>oiq$-GY?ef`QiVoLFlb$Yuue4'O!\hGIR'XlZN34Si%!b?'F@P;[>?hGX>_$U![pcf^5643I>A*@bIR0l'88eSt9#1I"Ii>\sYS1XKPW8B,&G)ESMO%P%LCEih+Kk,Y$SO0n+[WWroE3*UhSbV=\#f4#X5g/u&]6cGHpI1_U2t=(_)NmOXBeHkTF-Md8YAtCk=<%&pK$.Ym29nlKd>ArQLe;d>0>8(GNoo!5P#5Xq2OP$KZ(WkRj0\um_ZXKna6[m@O.CWVMnode_modulesn9CZjp2OULYI:t*#r7tJImT9%59J7G5L';YqXh*W>8Mra#S:[jXpBWC_(s?_Y]0M)=b4k(;#Ceejn0Ee[X)1q[ufOt_..`@7Oc@'GT\FW;Ub0$)#'iYs.b&XV#1;o5])AK/=bq)^:h&kJ5W+BopEq]f`+4q-]cD.qm4s6-,lboLYBh=t(ZkUjS[Zkeae=)[eZ5%[s%2Y&Fuc@jmVI)Uu1PgE<ZcbUp5^?cqY*dn#ro*lXX`Yj6`mMHYpDY<Z\l1dd0BH><=46V2"Ph,/j?L.*Q(BE!OSPX:*JS@O)aB&2@4Gr"Flb&D=qDPkHM^0kpp\Srl*@BuFcn5'L4#B02h-"erc/qZrr$C5ZdZ6,2,AHZKY"8\)kG4bWpi+(MGO8<com:4]'O7$o+h`>=R1gp+3N.tfhAZDgU?_jdfgXAj'QHqHaraa)]_e3k!!sl^i:=-dV\>']Gt_)hc7@gND72-^Zs\d^jdUUdU653+OTSjsqISI4+qQU(8egU7aP'A%Bpa]VVMItG2ZX^A:a/,WSE?hJ3`<;@rR207L\pJ3ea]c%UjbYI"MGO]pjcqbQ>a"k&#8dGD4`tLcfl)mfltaf\g_>kUgu,3?Y(^T4,UGsDkfaD44N1-K5C<3^jWBt=dnDh.!i$mVlk>_:nd3IPaj#!U0Q`^YF838CZPM]ag6C1Y.:6Kaes(=PL3?$L$X-K-bJGEWu;jg:/)0l:^m@ERfMi7Lb57'edu,NP8o8pXEMgj33tjjJX&bTJZ[cg0MLMa3n^5Yk5kY/]f;E6g)AKKbXs.p*A4h[BSE6@fQFhfdTHY!<#K=T)%/Yj:QE-;oJ1f#?50Y\e$)3udcL2HVSK\VXdWe%,4;t`&@gW^<X6,8JL%WenljkmO$4Q"[]Ekq=e-E"E';GtG1;)!o%H^(7r-!JQE8:e1WlBXTnNHE.E0Io5p14=eh@Va:e![;hgp\%A=P?[=\(eYl"`6LS[K)'/L6K:HW2-#g%+5q)Wgqh_KODoHgF]mhM'Y1p@4$a^YaO,]32re:51Qb>S8l3M<,hid,p)D@V.]Y*U_5Mr'ZJu/1i=k675rrqs'O,$k^U>StA0tS9lRdR-e?7W=Lqc>9!9i2jAfd>n0s6@bbXjeM_f<,tT'[l4[05Wb2*EdqNRuB%&2_8S//;0KAct#FF?cO#,XZHZ^<-,:WX"[7HeJg@(I#s"n<Kp22<s5NCi>gb-nB4#B^(QD^@!5*t29?!4h@o`HcCF?@tX$CRX<(iahRCrYiR605u6pF'$r#]W?L2V`(n"=Z!]hhTom_&aebFllkO+diP_ZbcH`VI@QnN^V`U_8I>5YV^>[^adnh1;DTQ$`*1?&2?`sb9c'XTBEZ]V.mZ%KZ]350QK4U(guVRRZF%h82.kB,ia2^m+-eQPH&KP^>/@q@>6Y<5NtA39ns+J,N7>c;WlPa6T./@eZmf#M`?(Ya&>;85#-Y7d]gi`Z+%6YDEV/<4Dc&B[;iojr(FnnH1PUL8WD,T;r]M,q%89@aAf8VGmLJ^)X,dTRp#csW."38C4q<Ve_e1lT+%l0dGM>,!j2JH.!5UB'crN`F/6.ipfg&Xs6YKWaKYORpF)$-f?/l65Ssj&>:>"QlDKW^5K7!SfT>.I)7)<>r&`@s9MV6Z^cFc3\%;'imi0;<rDD%okJH8WdH;g'-K=cU!VBl@j>jiJ]XUC^,&^3b4d:,R^e)&\SLucj_H-P3=RR=<:CEWoaN&j_;aoK7ETd=]$stRCA>H'8<ld3ADA\3?5]n^l36tuQO$4Uk-JK(mclX:I:,Z$S@o0BKE@&M$IgeY\LXtZ]<c2'JG`+^SCi\b*4C,TQT^>#B]7(?VB+?HV[q@o&LQk6[-s^i/\R.t,&I.E'ZF@lU,NQgqjZ1^oV_D:S"ZVrhH)EAk3.$.h*\5B$*tu`94i`[`M1i2[%M'"36hGnCAiks#675i<l2>Cmaj<nh8cTus)#,raU7Kh>i!H`n""S'P>l121K!i[O<pTn_E-r]LeT"Mmk_rISa"e$b@</?+*[KC^^r9#tn-Xl`6JPf$A30ISphiXm'Ag)nqTn_oC\c)PolaS"'2W>r&KuA,%mC?b^JAJZ2j-RWA9C_5pCg@XEQ%%-=u`Ru8VNiQI;e-Ro3(6R%4e'qTCTQe0/!o#B#f]"p#rCqnaLW%CBo$Y%BtoS]!Esb<Y6J-+K;/QMAkO8?gs7A.h3ni#l2H@r/P0_?JdTOns3&"f8eeb><AGUm@j+ZX[))B6@u<@/.`l^9g7,b3IIe\ch86#DE+]-oaJ;:*DW$Kq":!Vg=69i[Q.^T@!))$F`b&X^`qQC(db_!IQSSO%b[e5L+=Pc>/er9FQAtfA8\:pmC"itf69h1\D`9Td//-RQ0OL933/"ZI/L/E8PJZ[7FK/c"b$HjX"/1j!0I;;\0Br5,e"YAY(9Xg)180D@b0ld.]p$^3[rO6?K'3UW1Uf<kYZ8UA-af\pg]r"COe:q-D0MqG]0>Im?gJ>h29.SXmilOn_F%6Aq^NEPN[gcbk3rrR*>iJ&Qs%h$,3aVoDG\(jE1\4r1(Ap`V6.>',___9UpV10`mhcC#sTU-dL&.m]'Y8b$7X&Yj$ZjkYnbunk8Yl&@g1D75SS_I?k0&h#jqb$Bt9hB3i9J.h]\<L#c5I^ADbZ&G_"Nk9G,ZX^erg#r(:%OM@P&K5bAOd$slRo0fS98`<4s>laZIBWp'LqY>__j;6oFg$g61:)i,t*\@h\&cOiDRji)!+`6RYJ4Z/lR0)!>g`?.:+**,1!pLcC`iYj[S-;P21bEMtcC!:4>cd0c#cd/q>A_20+>bgE2".s@TjF+e5=g="5GH](bjS^$N'I30,j/ab)g^]@9-p"$^+*.:Ea[p/rbo5Y((>g9'9CgV)::a7'OR5r=_Y]bqAhY1[e&c26I.-0#/21HBApiP%Ni;Hq]Db^7$oRab.G"\nCZXbO^IVsRjJ,?9^hnsHc:f:!$16bc`c+?l#Z5Q;'F@ZBmXrdkC3ZLn<#u'9CZ@D?/.5q0pm`>4f9M@PEH)&D.J;OoEHe7jG1]%eS1Aq$.gSk3d-fHoj$@^ML0a?"29+s8;;5DCcqD6=Z$UNKA7jHKo60*0D$`6CVj17Y-W9(PJ0P?Q]]"-XNME[R8U^9JaE4\L^Bi7Jp'-%Xa!(0>I*T8"g$@'R2s[]#V%NJZmXgLZ:;@87CF.MHbJ9@>d"j&T#gj:n*#IDpO6iqk63VPALZ><m$1X-hhLXtac8b4f@3@/4=VZpL#T.%I9/&g,W:KT<>Tg0KZ8:=nQ'Us0%>trc)/!+o@4qGE@gm.lUUP6*m&?SJ4iG,Q;-&,I$cp&ec]<g,!@q6hL>ulScu7"8kgG4C;[VRRRu7ZHZ;lsEVKdT(7`NXkRH?Nd3tWDaO70<CJI4m$FH"Dr5bbjNQU/npon.,nk6)lredB9-a,%%V5.R0"_/??-@3D`KfN')ZQ,!u0-$CN2(`rtoX8drDudV=1Wga_@R,V[7>5N=2l7tHd7L64d9MCsr"TEY&'"&9U#O+9\Pr;BpN*#6`?+L?IJYkmncH\&VbU<TOYI2,Q:M)-Y]RV"ZtBS*\VG:]p^haMV)G\Sl;bYo&\M!>=8mO5\.*cW`gM]6qk;bBN]uI5fr_XphKUl*ZWHO%.)GWNp%RFW_YcDQmF/0n'7F6l=thX]L18u#65J-j4E[@9O+#?apDg?T<)JgYe(PC+K1rae>p4;2",DWUnBgSoE(?`Z3.$>Fg7:^@KdU+&Ai(5YOAhY>rZisTC13/oXYGp>$fZMq]8Em]N#0a;(%e%qN+7GoH5FgL$Gg8dSRQb.VFVf:;1mMA?E'sS+[+9mM&PVbW`4E-VK(U@S3_44bUk3bP#ab@bMl17DR)b$c+,Db*^Go(?\HU$joR]mK,bp;h^^gQq#&Qhi-JM-4cJ3G]<2rHH'shW'TiZUq%gW2p(R[!gt8LU8^H1PdT!,$#PRKfH<3.sW*+])MIWOg-p[0T6mmOooG6)B(!2-m@_^JnR\N"',/q)0XNAX4V/hD.pDen7EU3hV[bl>(DLk#+6"K%([9Rme+_?%;D`@oAAm=]p+/nf%5ujN3'\gFEJ**iC=pS(;<iJp$L)Xn9#f;2urq%ZaXl!">&ZP8Jrctu]rQK+n^+sUF_]Jb)en'Xu?E+80&fi8-Aj:He8n:e(/JA";J&iC`,Ro3q85?"]ah.?6[oEQ_=0omF&YIA!<X&cochQ)5#,)+mQ]3&+/c/qf:j+hPkFP2,U#klL\UD:gC52=,73Q\0-]TY/D)j%:!]`K;$!^VjkK-\Y9+E&ug"O4.DS..4TP]8Z#P0Ul/rFJ^G$U/?*CSU9<Rm3Y:qT4<2cefr5Q[4p'_\HD_>%dJLdXg03n#eA:0Kl3-Yb7<$9/.-.bmN'mDH%B!kqt*Ag@j40:$fI7f*a"I]J202EANr;V_l'N;gNJPeF-OWam6)OFq=f>(CkUY0h\m!(E"u$KafeT?H;Gf$lpjXr7I=E+ju`k!q;"J5(SuWYVO_<]13.g^R9;]8Ek;MgprPOc?c12a!^0S!P%M`E\fm'nN$?3T^Y=g;-Z8UkLDK6c\A=X5rXLPaSrWX14JWr%B+Ae.T@HEX[u+PFt-cmD.Qq=#tog+#+sNfm=$SA[+E-_G3`glDs[$*K4-^^i0[BM94ERTu.>7J&GhA305Z4])g[^+RNKYdkFAV@A%$J1S^I6Y]BD>bG@E7<$SQS0\?D4[@.1>S-6Tjc,Hf@-gQ`5([5,-d\a<pBW\1e+!cX/b.nR0^WN3tT]D@AUc,NEs1^&t+_MQaIbtkZ&%a/NO?q@>!@H@AG_aT$'#KH.VF$6%!;6IrU&pTY+4ihK1cEo>X](&a;sRo!/]M]#quN/G[GA5si43P!FUo[6'J"llelj_`mUmBc04,*;?9:aLOt'G95LJ`hkX*5\qHc6<5[Aq;YO`$M9kr;ChQe92DHSp*&ILOn`(6OZb"fbN>.R&f:,UHL6AnC-6pr?+\jVRS$`RrnhVLL,YD:AbF7u%!QAL@.GjW?dK42>hG$^6He<Y7P"Q]tLrOcq+E"->#(=Z[=oKOHpNm\_b8P,(6N,cYmbUD@SWb(2(mPq;BH\'BV:0mpX!*,*M^*//g8#3oh!e1H54MnF9(a^XRjfA7ge1Z4*/N?9l].V6<(d4K&P,*R49r"n!i2<Dq(e2]D`l-5kEGMHL_3lN*)ijI8S`47DlR?!pb>Eq%8t"+b,b]q>NQ#>!TWBD%?M#J=/UYOCFd&0@h)@2!i*Na557lk3QOL[6#"31^c'D3>SM-Oql?`+WQ9^t51T0T;;'.::V8XC3O&.oA5&C3<*?f6X#,uLb*HPINXl3:.nHG!OYAb2RS@;Ec<NG)%&sBj%fVqf@/_c^casq-\Lj6Y-BSP$m:roW]=QC=!A%1C%21t'@+eQ0(oNl^,>06TD8d%t)d*J/jJ7hi>N_Xm81W?o`a+krs7hrN?6b?h.=O7rE4*BdL?2D0r"Cu=DO[a^G-h7W10U-s/T"d'BCRh;")>eD1UaalCoW-6RFC!m5;0]\4j,U="uB:'*X0uiJ0::&@u8OdkA]P<mrZELMP^E<11_*0O)0BM;tI_j4NLC\Dcjo.BpJP8r2l0<1?J8]\\R70*0PeFsBA<N#Hq%WEJU4:HBbfY.cR`[LE>1ASd#tKV#<cc4\IDCcT.]=5c2)3t&@DG%Fi:]GTZrk;Y-B^JE4i(-a_/&pTWn7N0$q:Ji_0NbBuC`thKGjgPVV+DcdW_XGF+Lp#df@O$S>@a9laY-3"lI#GYm`)DuPfUqLV[0HS!/fDAut'r?]2-;`<tNW7;c'3u`(&IOWiq]ErRH^e%ZAS4'j,b-8'<2#c*J6Je\+M*1@jYp9T=s0;,7!<DL-=Idjm2aH0F,3j).<fp+`[SI$=(0gN&SrRtsDY)606]u0)i*)YoMpPK>JF]U%\L(a,k'I:\p7,2rN/sG<0@Vi_/cJ'&0H[R?W&f%m`T@Fm,-7;]oOlg$aaV3k(*Kpe8-YiJ4HT?!J/RkkC6MdRN`Omh'@YRP!R)B0dcElkhOH'\ns\\_7JhZpSZS2J98V^D]d6t7][G[?b4_?nG:(<TqC;.\U4oFoSYEsV%>-:?o]BJFSRo]nYc7Q3dc)??&Q5ke:G"N8f!2H7IFo1pcT(I")211a12I2%H*jQFmB5-f=T-jV/=$/Yer!PtHg5aZe=j[q@e<34(L_!3!%=aAb.[R(O1,2PQJeh\:k.'r@T1'4XJ]"t,mWD>K%YSn$3@CoMgm^TFSVifA6MFu)>*&7>Ci1%lN^TombLJB+O\Bs0teb=QiFV93W(S_on0s%m!gnoCT3aDJCOeW#:u@ILshW$RLb`j5h$FDkQW8+MB=Y6>!&c[5J0q$>1_H8/3RpU-)o+\g.ko>h0h$pgFb4+\.6$H#CsD$3CXW27:?"7r:'<NIAbGd`2kWG*Fi+t#Q^ocS4)RCgW'@foJo9b66BpLcXMQIh;OU^;#UKT![Qiu=H42"Vt\s'<AS[Mj(RB<NZ5Z*Ij@a(Mm7I+-%P@LotTD[H1/`Y/GAj"#EYVBbs)nIE21)Ium[M$ol1EnK/mAMIW6Ja@@^]5(^iSVGCg;''mU.K(k,o4FJ*e.M_F"l<`];!%)0:kq:4dN&KNLS#Zp7>2DY+$:^85,UYU8:i%-0Kn6k^U9b_F\(R`i+!HYjFAkWeQC\QnEu-Ek/)9X;,jR'p4do6$/6Q0WMneIa\<"$Gd^m<24:EiN@tjGmFZ*RZl)ClIG3.T2)Z(e,HD5PZpfbd`+L?Y@.`Yh;dTY!Mp+b/AS>+sq-b8La6no0r-!A-9&u:M+s3KF%aXG>lo>VGG2Rn;^T9KatcS>0&(msXn'<[-Peqh'8H#]c$M/(QIhT!r/eB*t$ZU=0un)pPg^6HSMPNi2(dp>C7@4*9GMJ5&b6oS#D@O$L)+<m(0ch*P=9m$Tl:<8:&mBW(IHBoJ!R>M-#39hLL>(QSO),f(2^GsMrV7;jG`3,Rs:X\)?%Kd\OH'Vm-P/$B7Y9Cc2[;93:$l_S*=>+>:O644Al2saOZOE`l9+.O@[2b<cg11l`ApH\B[0Vjtbp8\OUV<$'a2\i9JObo7PGoI7353Ip-2(&5j_2%=T1nT;[j0.\.IKYcHdbgsrfAmZIUnU/Z6H<8`Jc-NlIrZEL-sLsj`9c1-@_gAkB5>-D;_Tg):07UkGAf&`u3&;l)pemEjt[>rb%90Dkk#F/moMf$fSqiV(-)K6\#eg<>-&`mS`dk1=Q+C"pSY2+23+h'RJ(TN5>X/_JK1#Qn>6C1SJK[eiqM<jW5LAVGdj=D$oUQb/9Z...]=]

local decoded_K = G(b85_K)
local decoded_IU = G(b85_IU)

print("Decoded K Base85 len: ", #decoded_K)
print("Decoded IU Base85 len: ", #decoded_IU)

local ok_K, run_K = pcall(m, decoded_K, 2663)
if ok_K then
  print("--- DECOMPRESSED SECURITY (K) ---")
  print(run_K)
else
  print("Failed decompressing K:", run_K)
end

local ok_IU, run_IU = pcall(m, decoded_IU, 69199)
if ok_IU then
  print("--- DECOMPRESSED PAYLOAD (IU) ---")
  print(string.sub(run_IU, 1, 1500) .. "\n... (truncated due to length) ...")
else
  print("Failed decompressing IU:", run_IU)
end
