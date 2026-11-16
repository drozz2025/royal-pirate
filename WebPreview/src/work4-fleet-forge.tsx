import React from 'react';
import {PirateIcon} from './app-icons';
import {CREW, UPGRADES, upgradeCost, type LocalProfile, type UpgradeId} from './progression';

/**
 * Screens 03 and 04 of the approved eight-screen composition.
 * All state and prices are derived from the existing local profile.
 * There is only one owned ship; no inventory, armour upgrade or other ships
 * are fabricated to fill the visual layout.
 */
type FleetTab='mine'|'obtain'|'customize';
type ForgeTab=UpgradeId|'armour';
// Portuguese visual labels; underlying upgrade IDs, prices and persistence never change.
const upgradeLabel:Record<UpgradeId,string>={hull:'Casco',cannons:'Canhões',sails:'Velas'};
const fleetTabs:ReadonlyArray<{id:FleetTab;title:string}>=[
  {id:'mine',title:'A MINHA FROTA'},
  {id:'obtain',title:'OBTER NAVIOS'},
  {id:'customize',title:'PERSONALIZAR'}
];
const forgeTabs:ReadonlyArray<{id:ForgeTab;title:string}>=[
  {id:'hull',title:'NAVIO'},
  {id:'cannons',title:'CANHÕES'},
  {id:'armour',title:'ARMADURA'},
  {id:'sails',title:'VELAS'}
];

/** Original pictograms: these navigation tabs remain functioning controls. */
function FleetForgeSymbol({id}:{id:FleetTab|ForgeTab}){
  const art:Record<FleetTab|ForgeTab,React.ReactNode>={
    mine:<><path d="M3 15h18l-3 5H6l-3-5ZM11 3v12M11 4 5 13h6M13 5l6 8h-6"/><path d="M5 22q3-2 6 0t7 0"/></>,
    obtain:<><path d="M12 3v18M4 12h16M6 7l6-4 6 4M6 17l6 4 6-4"/><circle cx="12" cy="12" r="3"/></>,
    customize:<><path d="M4 19 18 5m-6-2 3-2 8 8-3 3M2 17l5 5-5 1Z"/><path d="m3 5 2-2m1 6 2-2M17 17l2 2m-2 2 2-2"/></>,
    hull:<><path d="M2 12q10 5 20 0l-4 8H6l-4-8ZM6 11V5h12v6M10 5V2h4v3"/><path d="M7 15h10"/></>,
    cannons:<><path d="M3 8 18 5l3 5-14 4-4-6Z"/><circle cx="17" cy="18" r="4"/><path d="M10 15 7 21m4-8 4 3M2 23h21"/></>,
    armour:<><path d="M12 2 3 6v6c0 5 3 8 9 10 6-2 9-5 9-10V6l-9-4Z"/><path d="m8 12 3 3 5-6"/></>,
    sails:<><path d="M12 2v19M10 4 2 17h8V4Zm4 1v12h8L14 5ZM5 21h14"/></>,
  };
  return <svg className="w4-tab-symbol" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{art[id]}</svg>;
}
/** Visual placeholders are silhouettes, never additional owned/purchasable ships. */
function FleetShadow({variant}:{variant:number}){
  const mast=variant===2?59:variant===3?66:73;
  return <svg className="w4-teaser-silhouette" viewBox="0 0 132 87" aria-hidden="true" focusable="false">
    <path d="M7 57Q65 68 125 56l-18 20Q63 84 24 73Z" fill="#102e42" stroke="#9ab4bd" strokeWidth="2.5"/>
    <path d={`M${mast} 12V59 M${mast-20} 55V25 M${mast+24} 57V30`}
      stroke="#b8b8ad" strokeWidth="2.5" fill="none"/>
    <path d={`M${mast-4} 19Q${mast-30} 38 ${mast-4} 51Z M${mast+3} 17Q${mast+34} 30 ${mast+10} 53H${mast+3}Z`}
      fill="#263d4b" stroke="#abc0c5" strokeWidth="2"/>
    <path d="M18 61h102M22 70h90" stroke="#ad8460" strokeWidth="2" opacity=".68"/>
    <path d="M12 81q14-7 28 0t30 0t30 0t25 0" stroke="#59a3b6" strokeWidth="3" fill="none"/>
  </svg>;
}

function ShipArtwork({small=false,part='ship'}:{small?:boolean;part?:'ship'|'cannons'|'sails'|'hull'|'armour'}){
  return <svg className={'w4-ship-art '+(small?'w4-ship-small':'')+' w4-part-'+part}
    viewBox="0 0 340 234" role="img" aria-label="Ilustração original do navio Royal Crown">
    <defs>
      <linearGradient id="w4-hull" x1="0" y1="0" x2="0.7" y2="1">
        <stop stopColor="#f9c779"/><stop offset=".24" stopColor="#683421"/><stop offset=".7" stopColor="#381e20"/><stop offset="1" stopColor="#bd793b"/>
      </linearGradient>
      <linearGradient id="w4-sail" x1="0" y1="0" x2=".9" y2="1">
        <stop stopColor="#404b57"/><stop offset=".6" stopColor="#111c2e"/><stop offset="1" stopColor="#111524"/>
      </linearGradient>
      <linearGradient id="w4-sea" x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#2cc2d6"/><stop offset="1" stopColor="#0c4b88"/>
      </linearGradient>
    </defs>
    <ellipse cx="179" cy="203" rx="140" ry="17" fill="#06314f" opacity=".65"/>
    <path d="M19 205Q59 195 99 207T178 204T255 208T330 202" stroke="#66e6ff" strokeWidth="5" fill="none" opacity=".7"/>
    <path className="w4-art-hull" d="M43 143Q163 160 300 136L271 188Q157 213 81 185Z"
      fill="url(#w4-hull)" stroke="#f5bd65" strokeWidth="5"/>
    <path d="M76 164Q177 181 285 158M95 188Q163 205 256 183" stroke="#bc8246" strokeWidth="4" fill="none"/>
    <path d="M58 146L292 137M84 136L266 136" stroke="#ffd18b" strokeWidth="7" strokeLinecap="round"/>
    <path d="M120 142V32M213 141V18M265 138V65" stroke="#7e522d" strokeWidth="7" strokeLinecap="round"/>
    <path d="M120 38Q70 53 77 124Q98 133 120 128Z" className="w4-art-sail" fill="url(#w4-sail)" stroke="#cba567" strokeWidth="3"/>
    <path d="M127 43Q176 43 196 119Q162 126 127 127Z" className="w4-art-sail" fill="url(#w4-sail)" stroke="#cba567" strokeWidth="3"/>
    <path d="M211 27Q264 39 254 114Q228 123 213 124Z" className="w4-art-sail" fill="url(#w4-sail)" stroke="#cba567" strokeWidth="3"/>
    <path d="M265 70Q298 72 291 127L266 129Z" className="w4-art-sail" fill="url(#w4-sail)" stroke="#cba567" strokeWidth="2"/>
    <path d="M213 18L253 28 213 40Z" fill="#bc2434" stroke="#ffd47c" strokeWidth="2"/>
    <path d="M120 32L155 43 120 54Z" fill="#b52a38" stroke="#ffd47c" strokeWidth="2"/>
    <path d="M167 76l-9 7m22 0-9-7m-4 7 4 10m0-10 4 10" stroke="#f3db9c" strokeWidth="4" strokeLinecap="round"/>
    <circle cx="165" cy="70" r="9" fill="#e8dcb6"/>
    <circle cx="161" cy="68" r="2" fill="#252532"/><circle cx="169" cy="68" r="2" fill="#252532"/>
    <path d="M101 156v9m41-5v10m41-7v10m42-8v8" stroke="#c5a36e" strokeWidth="2"/>
    {Array.from({length:6},(_,i)=><g key={i}>
      <circle className="w4-art-cannon" cx={91+i*29} cy={167+(i===2||i===3?5:0)} r="6" fill="#17202b" stroke="#e1a856" strokeWidth="3"/>
    </g>)}
    <path d="M299 137Q318 145 307 164Q292 171 282 151" fill="none" stroke="#f6b85c" strokeWidth="7"/>
    <path d="M38 207Q95 194 148 208T249 204T339 210" fill="none" stroke="url(#w4-sea)" strokeWidth="9" opacity=".8"/>
    {/* Sail stitch-work, bright royal insignia, rigging and brass windows. */}
    <g className="w4-art-rigging" fill="none" stroke="#e5c48d" strokeWidth="1.5" opacity=".84">
      <path d="M119 28L45 144M120 30L213 18L306 135M212 19L110 143M213 19L275 141M264 68L308 140"/>
      <path d="M79 74L119 75M130 70L191 70M215 60L254 65M81 100L120 105M131 96L185 98M217 94L253 93" opacity=".6"/>
    </g>
    <g className="w4-art-sail-stitch" stroke="#9eacb1" strokeWidth="1.2" fill="none" opacity=".58">
      <path d="M83 72Q97 82 117 78M80 102Q98 111 117 106M138 72Q167 67 184 82M139 108Q166 105 193 117M220 55Q234 56 247 70M221 90Q235 88 250 95"/>
    </g>
    <g className="w4-art-crest">
      <path d="M142 73Q166 60 186 74L187 103Q165 121 144 103Z" fill="#31333b" stroke="#d9ad69" strokeWidth="2" opacity=".96"/>
      <path d="M154 89q0-13 11-13t11 13l-4 8h-14Z" fill="#f8ebc4"/>
      <circle cx="161" cy="89" r="3" fill="#17212d"/><circle cx="170" cy="89" r="3" fill="#17212d"/>
      <path d="M160 100h11m-8-3v5m4-5v5m-11 11 21-17m0 17-21-17" stroke="#f4dfb7" strokeWidth="2.6" fill="none" strokeLinecap="round"/>
      <path d="M160 70l5-5 5 5 3-3-3 7h-11l-2-7Z" fill="#ffcd69"/>
    </g>
    <g fill="#ffcb68" stroke="#713a20" strokeWidth="1.4">
      <circle cx="105" cy="176" r="5"/><circle cx="134" cy="184" r="5"/><circle cx="163" cy="187" r="5"/><circle cx="193" cy="187" r="5"/><circle cx="222" cy="184" r="5"/><circle cx="251" cy="177" r="5"/>
    </g>
    <path d="M77 188Q148 225 265 188M89 194Q158 212 252 191" stroke="#f1c36f" strokeWidth="3.5" fill="none"/>
    <path d="M53 141Q53 132 69 126L71 146M270 139Q281 122 304 131L301 148" stroke="#e7af66" strokeWidth="5" fill="none"/>
    <g fill="#f0b665" stroke="#673a24" strokeWidth="1.5"><circle cx="57" cy="138" r="4"/><circle cx="293" cy="140" r="5"/></g>

    {/* Depth pass: raised sterncastle, timber grain, ornate gunports and rigging.
        All shapes remain independent SVG geometry, never a screenshot backdrop. */}
    <g className="w4-ship-detail" pointerEvents="none">
      <path d="M253 133L258 111 284 100 305 118 316 143 295 152Z" fill="#452a22" stroke="#e7ad61" strokeWidth="4"/>
      <path d="M260 119L278 111 291 121 293 143 257 147Z" fill="#694028" stroke="#ecbd72" strokeWidth="2"/>
      <path d="M269 117v23m14-24v25m-23-14h34" stroke="#d59b52" strokeWidth="3"/>
      <path d="M262 144q18-9 39 0" fill="none" stroke="#fbd681" strokeWidth="5"/>
      <path d="M88 167Q170 191 288 163M89 176Q168 200 278 175M94 183Q173 204 270 184" fill="none" stroke="#150e14" strokeWidth="2.5" opacity=".72"/>
      <path d="M86 170Q174 192 285 168M105 193Q181 205 259 186" fill="none" stroke="#ffd082" strokeWidth="2" opacity=".8"/>
      <path d="M51 149Q43 157 55 178L76 194 93 202M282 181l18-25 17 6" fill="none" stroke="#e8a64c" strokeWidth="5" strokeLinecap="round"/>
      <path d="M316 149q19 2 14 14l-13 4 3-10-10-4" fill="#e4a54b" stroke="#ffdb89" strokeWidth="2"/>
      <path d="M85 136Q177 146 282 130" fill="none" stroke="#f9d88c" strokeWidth="5"/>
      <path d="M81 136v11m16-12v12m16-11v11m16-9v11m16-12v11m16-11v11m16-11v11m16-12v10m16-12v11m16-13v12m16-14v12m16-14v11" stroke="#f6c77b" strokeWidth="2.4"/>
      <g fill="#fff1b4" opacity=".75">
        <circle cx="108" cy="157" r="1.8"/><circle cx="133" cy="161" r="1.8"/><circle cx="161" cy="164" r="1.8"/>
        <circle cx="192" cy="165" r="1.8"/><circle cx="221" cy="163" r="1.8"/><circle cx="251" cy="160" r="1.8"/>
      </g>
      <path d="M81 72Q94 54 119 41L119 120Q96 116 78 125" fill="none" stroke="#e5ddd0" strokeWidth="2" opacity=".52"/>
      <path d="M130 48Q164 49 189 111M220 35Q247 50 249 107" fill="none" stroke="#f5dfb6" strokeWidth="2.2" opacity=".55"/>
      <path d="M120 31L28 148M210 20L311 144M120 32L261 137" fill="none" stroke="#f8dc9d" strokeWidth="1.3" opacity=".65"/>
      <path d="M143 92l-15-26m64 33 10-32M223 81l-12-25" stroke="#ba8b55" strokeWidth="1.3" opacity=".8"/>
      <path d="M103 188q45 15 99 12" fill="none" stroke="#c68c50" strokeWidth="2" opacity=".7"/>
    </g>
    <path d="M36 204Q65 196 103 207M218 207Q256 199 316 205" stroke="#ddfcfa" strokeWidth="4" opacity=".85" fill="none" strokeLinecap="round"/>

  </svg>;
}


/** Original scalable environmental art: no screenshot or picture is used as a UI backdrop. */
function TropicalBackdrop(){
 return <svg className="w4-tropical-art" viewBox="0 0 420 310" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
  <defs>
   <linearGradient id="w4-cliff" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#70a456"/><stop offset=".34" stopColor="#2d6d4d"/><stop offset=".35" stopColor="#bb9560"/><stop offset="1" stopColor="#5a392c"/></linearGradient>
   <linearGradient id="w4-palm" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e7ae62"/><stop offset=".55" stopColor="#734127"/><stop offset="1" stopColor="#412923"/></linearGradient>
  </defs>
  <g fill="#dcf7fc" opacity=".6"><ellipse cx="109" cy="52" rx="49" ry="11"/><ellipse cx="139" cy="58" rx="62" ry="10"/><ellipse cx="318" cy="70" rx="54" ry="13"/></g>
  <path d="M0 199Q26 178 40 182T91 190Q118 205 123 217L0 246Z" fill="url(#w4-cliff)" stroke="#c9b18a" strokeWidth="4"/>
  <path d="M355 195Q382 173 419 185L422 250 346 240Z" fill="url(#w4-cliff)"/>
  <path d="M-18 234Q28 217 66 238T109 269H-10Z" fill="#af9f78" opacity=".84"/>
  <path d="M356 237Q399 216 442 237V280L361 266Z" fill="#c4aa75" opacity=".9"/>
  <g fill="none" stroke="url(#w4-palm)" strokeWidth="15" strokeLinecap="round">
   <path d="M23 213Q31 125 59 43"/><path d="M398 211Q375 125 341 65"/>
  </g>
  <g stroke="#254b30" strokeWidth="2" fill="#317f43">
   <path d="M59 44Q21 12 -9 27Q27 27 59 50Q21 41 0 83Q38 61 62 51Q63 10 95 0Q76 34 60 50Q107 4 144 33Q96 31 61 53Q102 42 127 79Q86 62 61 56Q77 82 74 124Q48 86 57 55Z"/>
   <path d="M341 65Q297 35 270 55Q308 53 342 72Q304 73 289 110Q323 84 346 73Q339 35 364 21Q361 52 344 72Q381 27 420 39Q385 48 345 74Q401 66 426 108Q387 87 341 77Q360 111 355 145Q327 103 341 75Z"/>
  </g>
  <g fill="#f4e5ae" opacity=".5"><path d="M0 274q35-7 65 2t56 0q35-10 66-3t60 0q31-8 68-2t99-1" stroke="#d6ffff" strokeWidth="3" fill="none"/></g>
  <g stroke="#9ff5fa" opacity=".65" fill="none" strokeLinecap="round"><path d="M0 289q30-9 59 0t64 0q30-11 60 0t61 0q34-9 64-1t110 0" strokeWidth="4"/><path d="M55 256q16-7 38-2m221 4q21-8 47-1" strokeWidth="3"/></g>
 </svg>;
}
function ForgeBackdrop(){
 return <svg className="w4-forge-art" viewBox="0 0 420 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
  <defs>
   <linearGradient id="w4-woodgrain" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#aa7545"/><stop offset=".45" stopColor="#523529"/><stop offset="1" stopColor="#241e22"/></linearGradient>
   <radialGradient id="w4-fireglow"><stop stopColor="#ffe57f"/><stop offset=".34" stopColor="#ff973b"/><stop offset=".73" stopColor="#c23b22"/><stop offset="1" stopColor="#4e1d1b"/></radialGradient>
  </defs>
  <path d="M0 0H420V290H0Z" fill="#17263a" opacity=".45"/>
  <path d="M25 0V278M152 0V247M389 0V284M0 35H420" stroke="#301d20" strokeWidth="25" opacity=".9"/>
  <path d="M26 0V278M153 0V247M389 0V284M0 35H420" stroke="url(#w4-woodgrain)" strokeWidth="16"/>
  <path d="M0 81L191 0M227 0L420 78" stroke="#bd8853" strokeWidth="12" opacity=".6"/>
  <path d="M24 142Q37 50 107 54Q159 54 168 138V271H24Z" fill="#2c2929" stroke="#b07d48" strokeWidth="9"/>
  <path d="M40 151Q51 85 103 85Q142 84 151 150V257H40Z" fill="#412b2b" stroke="#17151f" strokeWidth="9"/>
  <ellipse cx="104" cy="213" rx="68" ry="80" fill="url(#w4-fireglow)" opacity=".83"/>
  <path d="M77 254Q62 228 87 197Q81 222 103 216Q96 185 119 163Q110 202 137 218Q146 239 129 259Z" fill="#ffbe4a" stroke="#ffed93" strokeWidth="3"/>
  <path d="M0 264L420 248V305H0Z" fill="#413327" stroke="#b88f53" strokeWidth="7"/>
  <path d="M0 278L420 265M56 266L55 302M175 265L182 301M312 261L332 303" stroke="#9d7a4c" strokeWidth="3" opacity=".6"/>
  <g stroke="#cc9d5b" fill="none" strokeWidth="5"><circle cx="28" cy="232" r="27"/><path d="M28 205v54M1 232h54m-45-19 36 37m0-37-36 37"/></g>
  <path d="M304 28Q302 102 314 135" stroke="#c6a177" strokeWidth="5" fill="none" strokeDasharray="7 5"/>
  <path d="M0 260Q180 220 420 250" stroke="#ffd181" strokeWidth="3" opacity=".24" fill="none"/>

    {/* Architectural depth for the workshop: masonry blocks, timber lattice,
        ember light and brass fittings rather than the flat navy void. */}
    <g className="w4-forge-environment-detail" pointerEvents="none">
      <path d="M23 139Q36 51 109 47Q170 52 179 148" stroke="#5e3728" strokeWidth="18" fill="none"/>
      <path d="M23 139Q36 51 109 47Q170 52 179 148" stroke="#e9ac65" strokeWidth="5" fill="none"/>
      <path d="M30 146h136M36 104h130M58 74h97M35 183h127M32 220h132" stroke="#c4804b" strokeWidth="3" opacity=".8"/>
      <path d="M76 76v28m49-29v29M48 110v34m56-34v37m45-34v37M69 149v34m58-34v34M48 186v36m65-36v36" stroke="#a26342" strokeWidth="2.6" opacity=".74"/>
      <path d="M201 34H378M202 42H382M195 60h204M201 89h194" stroke="#d2a36b" strokeWidth="4" opacity=".32"/>
      <path d="M207 21v205m175-201v212m-160-200v206m146-205v200" stroke="#875934" strokeWidth="10" opacity=".44"/>
      <path d="M210 25l164 176m-165 0L376 26" stroke="#a77849" strokeWidth="7" opacity=".24"/>
      <g fill="#fff2b1" opacity=".88">
       <circle cx="67" cy="176" r="2.2"/><circle cx="136" cy="155" r="3"/><circle cx="154" cy="187" r="1.8"/>
       <circle cx="87" cy="140" r="2"/><circle cx="127" cy="196" r="2.8"/>
      </g>
      <path d="M10 253L397 242M12 267L411 260M33 279L421 274" stroke="#daa365" strokeWidth="2" opacity=".55"/>
      <path d="M226 235v39m89-42v41m70-45v38" stroke="#241d22" strokeWidth="5" opacity=".5"/>
    </g>
 </svg>;
}

/** Original 2D cannon illustration for the Forge's largest visual stage.
 * Decorative only: it never claims to be an installed 3D cannon or a combat stat. */
function ForgeCannonArtwork(){
  return <svg className="w4-cannon-art" viewBox="0 0 420 290" role="img" aria-label="Canhão pirata de bronze e aço, ilustração original da forja">
    <defs>
      <linearGradient id="w4-cannon-barrel" x1="0" y1="0" x2=".25" y2="1">
        <stop stopColor="#ffe5a1"/><stop offset=".12" stopColor="#be985e"/><stop offset=".32" stopColor="#51616b"/>
        <stop offset=".55" stopColor="#122333"/><stop offset=".84" stopColor="#071b2c"/><stop offset="1" stopColor="#bda06f"/>
      </linearGradient>
      <linearGradient id="w4-cannon-brass" x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#fff6bc"/><stop offset=".24" stopColor="#f1c670"/><stop offset=".56" stopColor="#9b612b"/><stop offset="1" stopColor="#5c371f"/>
      </linearGradient>
      <radialGradient id="w4-cannon-muzzle"><stop stopColor="#020d1c"/><stop offset=".8" stopColor="#0a1923"/><stop offset="1" stopColor="#7b6a57"/></radialGradient>
    </defs>
    <ellipse cx="188" cy="250" rx="172" ry="22" fill="#061928" opacity=".55"/>
    <path d="M63 233 L285 173 L377 206 L162 273Z" fill="#502d22" stroke="#d99c54" strokeWidth="8" strokeLinejoin="round"/>
    <path d="M84 231 L284 187 L351 209 L157 258" fill="none" stroke="#f9cc7a" strokeWidth="5"/>
    <path d="M97 240 L127 268 M184 217 L202 252 M275 199 L290 229" stroke="#2a1b1e" strokeWidth="12"/>
    <circle cx="277" cy="218" r="46" fill="#462b27" stroke="#e4b56e" strokeWidth="11"/>
    <circle cx="277" cy="218" r="26" fill="#765032" stroke="#291f22" strokeWidth="5"/>
    <path d="M277 178v80m-40-40h80m-67-28 54 56m0-56-54 56" stroke="#f0bd6b" strokeWidth="6"/>
    <circle cx="277" cy="218" r="10" fill="#f2d28b" stroke="#714521" strokeWidth="4"/>
    <path d="M69 144 L287 93 L328 158 L93 219 Z" fill="url(#w4-cannon-barrel)" stroke="#d4a15c" strokeWidth="5" strokeLinejoin="round"/>
    <path d="M125 130L290 96L310 155L148 197Z" fill="none" stroke="#f0cb88" strokeWidth="6" opacity=".75"/>
    <path d="M217 112 L231 173 M265 101 L281 165" stroke="#f8d187" strokeWidth="15" opacity=".88"/>
    <path d="M217 112 L231 173 M265 101 L281 165" stroke="#653d23" strokeWidth="3"/>
    <path d="M88 143 Q59 143 43 158 L59 223 Q77 229 102 218Z" fill="url(#w4-cannon-brass)" stroke="#f8e09b" strokeWidth="4"/>
    <ellipse cx="64" cy="187" rx="37" ry="43" transform="rotate(-12 64 187)" fill="url(#w4-cannon-brass)" stroke="#f9dd9e" strokeWidth="7"/>
    <ellipse cx="64" cy="187" rx="24" ry="31" transform="rotate(-12 64 187)" fill="url(#w4-cannon-muzzle)" stroke="#8f7046" strokeWidth="5"/>
    <path d="M301 107 L339 106 L355 135 L331 155 L312 155Z" fill="url(#w4-cannon-brass)" stroke="#fbd88e" strokeWidth="5"/>
    <circle cx="344" cy="129" r="10" fill="#8d5124" stroke="#fce5a0" strokeWidth="3"/>

    {/* Bronze reinforcement hoops, shaded timber carriage, and raised metal
        details give the hero cannon visual weight without new game logic. */}
    <g className="w4-cannon-detail" pointerEvents="none">
      <path d="M94 210L285 157 325 184 137 251Z" fill="#865535" opacity=".65"/>
      <path d="M117 221L308 171M142 247L330 190" stroke="#f6cc86" strokeWidth="5" opacity=".85"/>
      <path d="M172 215l12 27m62-45 15 29" stroke="#41281e" strokeWidth="9"/>
      <path d="M111 138L282 100 311 151 139 190Z" fill="#132e43" opacity=".63"/>
      <path d="M119 133L280 97M151 192L314 151" stroke="#f4d496" strokeWidth="3" opacity=".85"/>
      <path d="M180 123L196 179M234 109L251 168" stroke="#e4b870" strokeWidth="13" opacity=".95"/>
      <path d="M180 123L196 179M234 109L251 168" stroke="#64452e" strokeWidth="3"/>
      <path d="M143 135l31-7M204 116l29-7M260 101l31-7" stroke="#fff2bf" strokeWidth="4" opacity=".7"/>
      <path d="M102 162L274 117" stroke="#c5d8db" strokeWidth="5" opacity=".48"/>
      <ellipse cx="64" cy="186" rx="36" ry="42" transform="rotate(-12 64 186)" fill="none" stroke="#ffecad" strokeWidth="3"/>
      <ellipse cx="64" cy="186" rx="28" ry="34" transform="rotate(-12 64 186)" fill="none" stroke="#ab793e" strokeWidth="5"/>
      <path d="M51 158q-21 25-4 52" stroke="#fff8cc" strokeWidth="4" opacity=".82" fill="none"/>
      <circle cx="275" cy="217" r="36" fill="none" stroke="#fce2a2" strokeWidth="3" opacity=".8"/>
      <circle cx="275" cy="217" r="13" fill="none" stroke="#8d582c" strokeWidth="4"/>
      <g fill="#ffe8ad" opacity=".88">
       <circle cx="151" cy="143" r="2"/><circle cx="198" cy="130" r="2.2"/><circle cx="250" cy="116" r="2"/>
       <circle cx="151" cy="180" r="2"/><circle cx="201" cy="164" r="2"/><circle cx="263" cy="147" r="2"/>
      </g>
    </g>
    <path d="M36 236Q64 226 83 240M353 234Q380 219 397 235" stroke="#fbcc7b" strokeWidth="3" fill="none" opacity=".7"/>
  </svg>;
}

export function FleetPanel({profile,onForge,onCrew,onPorto}:{profile:LocalProfile;onForge:()=>void;onCrew:()=>void;onPorto:()=>void}){
  const [tab,setTab]=React.useState<FleetTab>('mine');
  const [details,setDetails]=React.useState(true);
  const captain=CREW.find(c=>c.id===profile.equippedCrew)?.name??'Captain Mara';
  const total=UPGRADES.reduce((s,u)=>s+profile.upgrades[u.id],0);
  return <section className="w4-screen w4-fleet" aria-label="A minha frota">
    <div className="w4-title">
      <div className="w4-kicker">ESTALEIRO REAL · PROGRESSO LOCAL</div>
      <h2><PirateIcon name="fleet" size={26}/> FROTA</h2>
    </div>
    <div role="tablist" aria-label="Secções da frota" className="w4-tabs w4-fleet-tabs">
      {fleetTabs.map(t=><button key={t.id} type="button" role="tab" id={'w4-fleet-tab-'+t.id}
        aria-selected={tab===t.id} aria-controls="w4-fleet-panel"
        onClick={()=>setTab(t.id)}><FleetForgeSymbol id={t.id}/><span>{t.title}</span></button>)}
    </div>
    <div id="w4-fleet-panel" role="tabpanel" aria-labelledby={'w4-fleet-tab-'+tab}>
      <div className="w4-harbour-stage">
        <div className="w4-island w4-island-left" aria-hidden="true"/>
        <div className="w4-island w4-island-right" aria-hidden="true"/>
        <TropicalBackdrop/>
        <ShipArtwork/>
        <div className="w4-stage-label"><span>★ NAVIO REAL</span><strong>ROYAL CROWN</strong>
          <small>1 navio disponível · Capitão {captain}</small>
          <div className="w4-stage-stats" aria-label="Níveis reais da frota">
            {UPGRADES.map(u=><span key={u.id}><strong>{upgradeLabel[u.id]}</strong><em>{profile.upgrades[u.id]} / 5</em></span>)}
          </div>
          <b>✓ ATIVO</b>
        </div>
      </div>
      {tab==='mine'&&<div className="w4-fleet-state">
        <div className="w4-fleet-stats" aria-label="Melhorias locais guardadas">
          {UPGRADES.map(u=><span key={u.id}><b>{upgradeLabel[u.id]}</b><strong>{profile.upgrades[u.id]} / 5</strong></span>)}
          <span><b>PROGRESSO TOTAL</b><strong>{total} / 15</strong></span>
        </div>
        <div className="w4-action-pair">
          <button type="button" className="w4-primary" onClick={onForge}>⚒ ABRIR MELHORIAS</button>
          <button type="button" onClick={onPorto}>VER NAVIO NO PORTO</button>
        </div>
      </div>}
      {tab==='obtain'&&<div className="w4-fleet-state" role="status">
        <h3>Obter navios</h3>
        <p>A Royal Crown é o único navio existente nesta versão. Não há ainda construção, desbloqueios ou compra de outros navios.</p>
        <button type="button" className="w4-primary" onClick={onPorto}>EXPLORAR A ROYAL CROWN</button>
      </div>}
      {tab==='customize'&&<div className="w4-fleet-state">
        <h3>Personalizar a frota</h3>
        <p>O capitão equipado é guardado neste dispositivo. Cores, velas e peças cosméticas ainda não podem ser alteradas.</p>
        <div className="w4-custom-captain"><span aria-hidden="true">♛</span><div><strong>{captain}</strong><small>CAPITÃO EQUIPADO</small></div></div>
        <button type="button" className="w4-primary" onClick={onCrew}>GERIR CAPITÃO / CARTAS</button>
      </div>}
      <div className="w4-cards-caption"><strong>NAVIOS DA FROTA</strong><small>1 disponível · restantes em desenvolvimento</small></div>
      <div className="w4-ship-roster" role="group" aria-label="Selecionar navio da frota">
        {[2,3,4].map((n)=><div key={n} className="w4-ship-slot is-pending"
          aria-label={['FRAGATA — ESPAÇO 2','BRIGANTINA — ESPAÇO 3','GALEÃO — ESPAÇO 4'][n-2]+' — navio indisponível'}>
          <span className="w4-slot-art w4-slot-unavailable" aria-hidden="true">
            <span className={'w4-approved-thumb w4-approved-thumb-'+n}><FleetShadow variant={n}/></span>
          </span>
          <strong>{['FRAGATA','BRIGANTINA','GALEÃO'][n-2]}</strong><small>EM DESENVOLVIMENTO</small></div>)}
        <button type="button" className="w4-ship-slot is-active" aria-pressed={details}
          onClick={()=>setDetails(v=>!v)} aria-label="Royal Crown, navio ativo, alternar detalhes">
          <span className="w4-slot-art"><ShipArtwork small/></span><strong>ROYAL CROWN</strong><small>✓ DISPONÍVEL</small>
        </button>
      </div>
      {details&&<p className="w4-footnote">Royal Crown selecionada. O navio 3D interativo encontra-se no Porto. O estaleiro guarda níveis reais, mas ainda não altera o combate.</p>}
    </div>
  </section>;
}

export function ForgePanel({profile,onUpgrade,onFleet}:{profile:LocalProfile;onUpgrade:(id:UpgradeId)=>void;onFleet:()=>void}){
  const [tab,setTab]=React.useState<ForgeTab>('cannons');
  const upgrade=tab==='armour'?undefined:UPGRADES.find(u=>u.id===tab);
  const level=upgrade?profile.upgrades[upgrade.id]:0;
  const max=Boolean(upgrade)&&level>=5;
  const cost=upgrade&&!max?upgradeCost(upgrade.id,level):0;
  const shortfall=Math.max(0,cost-profile.coins);
  return <section className="w4-screen w4-forge" aria-label="Melhorias e forja">
    <div className="w4-title"><div className="w4-kicker">ESTALEIRO · ROYAL CROWN</div>
      <h2><PirateIcon name="forge" size={26}/> MELHORIAS</h2></div>
    <div className="w4-tabs w4-forge-tabs" role="tablist" aria-label="Sistemas do navio">
      {forgeTabs.map(t=><button type="button" role="tab" id={'w4-forge-tab-'+t.id} key={t.id}
        aria-selected={tab===t.id} aria-controls="w4-forge-panel"
        onClick={()=>setTab(t.id)}><FleetForgeSymbol id={t.id}/><span>{t.title}</span></button>)}
    </div>
    <div id="w4-forge-panel" role="tabpanel" aria-labelledby={'w4-forge-tab-'+tab}>
      <div className="w4-forge-stage">
        <div className="w4-forge-scene">
          <div className="w4-forge-glow" aria-hidden="true"/>
          <ForgeBackdrop/>
          {tab==='cannons'?<ForgeCannonArtwork/>:<ShipArtwork part={tab==='armour'?'armour':tab==='hull'?'hull':tab}/>}
        </div>
        <div className="w4-forge-description"><div className="w4-forge-medallion"><FleetForgeSymbol id={tab}/></div><span>{upgrade?'MELHORIA LOCAL DISPONÍVEL':'FUNÇÃO FUTURA'}</span>
          <h3>{upgrade?upgradeLabel[upgrade.id]:'Armadura'}</h3>
          {upgrade?<strong>NÍVEL {level} <em>→ {max?'MAX':level+1}</em></strong>:<strong>INDISPONÍVEL</strong>}
          <div className="w4-forge-live-levels" aria-label="Níveis reais guardados no estaleiro">
            {UPGRADES.map(system=><div key={system.id} className={'w4-forge-live-level'+(tab===system.id?' is-current':'')}>
              <span>{upgradeLabel[system.id]}</span>
              <b>{profile.upgrades[system.id]}/5</b>
              <i aria-hidden="true"><span style={{width:(profile.upgrades[system.id]*20)+'%'}}/></i>
            </div>)}
          </div>
        </div>
      </div>
      <div className="w4-attributes" aria-label="Atributos guardados">
        <h3>PROGRESSO DO ESTALEIRO</h3>
        {upgrade?
          <div className="w4-level-track" role="progressbar" aria-label={'Nível de '+upgradeLabel[upgrade.id]}
            aria-valuemin={0} aria-valuemax={5} aria-valuenow={level}>
            {[1,2,3,4,5].map(i=><span key={i} className={i<=level?'is-filled':''}/>)}
          </div>:
          <p>Não existe um sistema de armadura no progresso local. Não há níveis, preços ou benefícios para apresentar.</p>}
        <div className="w4-system-levels" aria-label="Níveis locais dos sistemas do navio">
          {UPGRADES.map(u=><div key={u.id}>
            <strong>{upgradeLabel[u.id]}</strong><small>NÍVEL {profile.upgrades[u.id]} / 5</small>
            <span role="progressbar" aria-label={upgradeLabel[u.id]+' shipyard upgrade progress'} aria-valuemin={0} aria-valuemax={5}
              aria-valuenow={profile.upgrades[u.id]} className="w4-mini-track">
              <i style={{width:profile.upgrades[u.id]*20+'%'}}/>
            </span>
          </div>)}
        </div>
        {upgrade&&<p>O nível fica guardado no dispositivo. Esta melhoria ainda não altera dano, vida, velocidade ou o modelo 3D no combate.</p>}
      </div>
      <div className="w4-materials" aria-label="Custo e materiais disponíveis">
        <h3>MATERIAIS E CUSTOS</h3>
        {upgrade&&<div className="w4-resource-grid">
          <div><span className="w4-coin" aria-hidden="true">●</span><small>MOEDAS LOCAIS</small><strong>{profile.coins.toLocaleString('pt-PT')}</strong></div>
          <div><span aria-hidden="true">⚒</span><small>{max?'MELHORIA COMPLETA':'CUSTO REAL'}</small><strong>{max?'MÁXIMO':cost.toLocaleString('pt-PT')+' ●'}</strong></div>
          <div><span aria-hidden="true">◆</span><small>EM FALTA</small><strong>{max?'—':shortfall.toLocaleString('pt-PT')+' ●'}</strong></div>
        </div>}
        <p>{upgrade?'Não existe inventário de madeira, ferro ou gemas nesta versão: apenas moedas locais são usadas.':'A armadura e os respetivos materiais ainda não estão implementados.'}</p>
      </div>
      {upgrade?<button type="button" className="w4-improve-button" disabled={max||shortfall>0}
        onClick={()=>onUpgrade(upgrade.id)} aria-label={max?'Melhoria no máximo':shortfall>0?'Moedas insuficientes, faltam '+shortfall:'Melhorar '+upgradeLabel[upgrade.id]+' por '+cost+' moedas'}>
        {max?'MELHORIA MÁXIMA':shortfall>0?'MOEDAS INSUFICIENTES':'MELHORAR · '+cost.toLocaleString('pt-PT')+' ●'}
      </button>:<button type="button" className="w4-improve-button" disabled>ARMADURA INDISPONÍVEL</button>}
      <div className="w4-action-pair"><button type="button" onClick={onFleet}>← VOLTAR À FROTA</button></div>
      <p className="w4-footnote">Os valores apresentados são exclusivamente níveis e moedas guardados neste navegador. Sem compras externas nem efeitos de combate simulados.</p>
    </div>
  </section>;
}
