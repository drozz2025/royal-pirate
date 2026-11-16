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

      <linearGradient id="w4-galleon-darkwood" x1=".12" y1=".12" x2=".9" y2="1">
        <stop stopColor="#8e4b2a"/><stop offset=".2" stopColor="#552e24"/>
        <stop offset=".58" stopColor="#241a22"/><stop offset=".83" stopColor="#3e2626"/>
        <stop offset="1" stopColor="#a46232"/>
      </linearGradient>
      <linearGradient id="w4-galleon-canvas" x1="0" y1="0" x2="1" y2=".35">
        <stop stopColor="#0c1424"/><stop offset=".24" stopColor="#39414b"/>
        <stop offset=".5" stopColor="#101929"/><stop offset=".74" stopColor="#424850"/>
        <stop offset="1" stopColor="#0b1526"/>
      </linearGradient>

      {/* Sculpted cloth illumination for the original live Royal Crown vector. */}
      <linearGradient id="w4-canvas-sculpt" x1="0" y1=".2" x2="1" y2=".65">
        <stop stopColor="#101724"/><stop offset=".24" stopColor="#4d5663"/>
        <stop offset=".4" stopColor="#252c37"/><stop offset=".64" stopColor="#0c1423"/>
        <stop offset=".82" stopColor="#343d48"/><stop offset="1" stopColor="#111827"/>
      </linearGradient>
      <linearGradient id="w4-wood-relief" x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#d9a45e"/><stop offset=".18" stopColor="#71442e"/>
        <stop offset=".54" stopColor="#2d1d22"/><stop offset="1" stopColor="#a56536"/>
      </linearGradient>
      <linearGradient id="w4-sea" x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#2cc2d6"/><stop offset="1" stopColor="#0c4b88"/>
      </linearGradient>
      <linearGradient id="w4-hero-wood-sheen" x1="0" y1="0" x2=".1" y2="1">
        <stop stopColor="#fce0a2"/><stop offset=".16" stopColor="#aa6035"/>
        <stop offset=".42" stopColor="#312125"/><stop offset=".74" stopColor="#1a171f"/>
        <stop offset="1" stopColor="#d0914b"/>
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

    {/* WORK4/03: individually curved dark canvas with specular seams, not a
        flat light mesh. Drawn under the already-real skull crest and rigging. */}
    {!small&&<g className="w4-galleon-sail-volume" pointerEvents="none">
      <path d="M120 40Q98 45 80 56Q71 83 78 123Q98 134 120 127Z"
        fill="url(#w4-galleon-canvas)" fillOpacity=".81"/>
      <path d="M129 46Q166 42 193 92L197 119Q162 132 127 127Z"
        fill="url(#w4-galleon-canvas)" fillOpacity=".83"/>
      <path d="M214 30Q252 40 255 70Q257 95 254 115Q235 125 213 124Z"
        fill="url(#w4-galleon-canvas)" fillOpacity=".82"/>
      <g stroke="#909598" fill="none" opacity=".53" strokeWidth="2.5">
        <path d="M88 56Q79 91 88 121M107 47Q101 85 112 122"/>
        <path d="M140 49Q156 77 158 125M176 66Q188 95 186 120"/>
        <path d="M227 37Q237 72 227 119M245 50Q252 81 247 111"/>
      </g>
      <g stroke="#c7b38e" fill="none" strokeWidth="1.8" opacity=".68">
        <path d="M81 65Q101 73 118 70M79 95Q97 102 119 99"/>
        <path d="M130 75Q161 69 181 93M134 112Q164 119 193 113"/>
        <path d="M217 60Q235 66 253 67M215 95Q236 98 252 94"/>
      </g>
      <path d="M121 39Q117 83 121 129M212 27Q210 80 213 126"
        fill="none" stroke="#f0d7a8" strokeWidth="2.6" opacity=".68"/>
    </g>}

    {/* WORK4 reference 03: curved light/shadow planes follow the four original
        black sails, leaving the live crest and interactive controls untouched. */}
    {!small&&<g className="w4-galleon-sculpted-canvas" pointerEvents="none">
      <path d="M119 40Q96 41 79 55Q69 90 78 123Q97 138 120 126Z"
        fill="url(#w4-canvas-sculpt)" stroke="#d7ac70" strokeWidth="2"/>
      <path d="M127 45Q156 38 178 65Q195 93 198 118Q166 138 127 127Z"
        fill="url(#w4-canvas-sculpt)" stroke="#caa16b" strokeWidth="2.3"/>
      <path d="M213 29Q238 31 252 51Q261 89 254 115Q235 131 213 124Z"
        fill="url(#w4-canvas-sculpt)" stroke="#d1ab72" strokeWidth="2"/>
      <g fill="none" strokeLinecap="round">
        <path d="M83 56Q75 89 84 121M105 44Q98 91 111 123M139 49Q155 85 149 125M177 68Q188 93 187 120M224 38Q233 73 226 120M245 49Q253 80 246 109"
          stroke="#91a0a3" strokeWidth="4.2" opacity=".55"/>
        <path d="M96 48Q87 82 100 124M165 49Q180 80 178 122M238 43Q249 78 240 115"
          stroke="#030b18" strokeWidth="5.5" opacity=".61"/>
        <path d="M79 91Q97 101 119 96M131 85Q162 81 188 94M213 81Q232 87 254 83"
          stroke="#d8cfb8" strokeWidth="1.8" opacity=".63"/>
        <path d="M79 124Q95 130 119 126M127 126Q165 138 197 118M213 124Q235 130 254 115"
          stroke="#f2d39a" strokeWidth="2.5" opacity=".74"/>
      </g>
    </g>}
    {/* Oilcloth over the previously exposed rigging lattice: deep curved
        canvas stays on the same SVG ship while the real crest is drawn on top. */}
    {!small&&<g className="w4-sail-deep-canvas" pointerEvents="none">
      <path d="M117 44Q99 44 80 57Q70 88 78 123Q98 135 120 127Z"
        fill="url(#w4-canvas-sculpt)" stroke="#be995f" strokeWidth="2.6"/>
      <path d="M130 46Q166 38 186 73Q195 89 198 118Q162 137 128 127Z"
        fill="url(#w4-galleon-canvas)" stroke="#d1b07a" strokeWidth="2.7"/>
      <path d="M213 30Q237 31 254 52Q262 85 254 116Q236 132 214 123Z"
        fill="url(#w4-canvas-sculpt)" stroke="#c7a773" strokeWidth="2.5"/>
      <path d="M265 72Q286 75 292 89Q299 112 290 128L266 130Z"
        fill="#172334" stroke="#caa975" strokeWidth="1.8"/>
      <g fill="none" strokeLinecap="round">
        <path d="M92 49Q80 90 88 123M108 45Q100 86 114 123
          M143 47Q164 84 159 127M179 69Q194 97 188 121
          M226 38Q240 77 229 119M245 47Q259 88 249 113"
          stroke="#64727c" strokeWidth="5.5" opacity=".51"/>
        <path d="M100 46Q94 77 104 119M158 48Q183 85 176 120
          M235 43Q253 80 239 116" stroke="#090e1b"
          strokeWidth="6.5" opacity=".65"/>
        <path d="M80 87Q99 98 118 92M130 79Q159 76 185 91
          M216 79Q237 88 255 82" stroke="#d7d4bd" strokeWidth="1.7"
          opacity=".65"/>
        <path d="M78 122Q96 133 119 125M129 127Q164 139 197 117
          M214 124Q236 132 254 114" stroke="#f2d39c"
          strokeWidth="2.5" opacity=".83"/>
      </g>
    </g>}
    <g className="w4-art-crest" transform={small?undefined:'translate(-33 -20) scale(1.2)'}>
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
    {/* Fleet 03 fidelity: layered carved timber, shaded sails, fittings and
        wake are original vector geometry attached to the same live ship.
        No screenshot, 3D model, ownership state or combat value is introduced. */}
    <g className="w4-ship-premium-surface" pointerEvents="none">
      {/* Three-dimensional-looking hull planking, raised gunwale and gold scrollwork. */}
      <path d="M55 152Q165 169 298 141L278 179Q174 210 91 187L73 173Z"
        fill="#211b24" opacity=".34"/>
      <path d="M67 158Q173 177 284 152M77 168Q183 190 277 164M84 180Q171 200 268 177"
        stroke="#e6aa61" strokeWidth="2.2" fill="none" opacity=".94"/>
      <path d="M78 174Q171 196 274 170M90 187Q172 207 255 185"
        stroke="#291d22" strokeWidth="3.1" fill="none" opacity=".92"/>
      <path d="M63 145Q165 159 294 140" stroke="#ffe0a0" strokeWidth="4.6"
        fill="none" strokeLinecap="round"/>
      <path d="M57 150Q67 170 86 187M299 141Q294 165 270 184"
        fill="none" stroke="#d99a51" strokeWidth="5"/>
      <path d="M76 181Q164 222 268 185" fill="none" stroke="#ffd08a"
        strokeWidth="2.5" opacity=".95"/>
      {/* Bow carving and a separate raised stern gallery. */}
      <path d="M47 149q-13-7-21 1 10 0 10 13 12 4 23-9M39 155q-7 14 1 25"
        fill="#bd7635" stroke="#ffe2a0" strokeWidth="2.6"/>
      <path d="M42 148q-5-8 0-13 10-2 13 8" fill="none" stroke="#ffda8f" strokeWidth="3"/>
      <path d="M249 127L263 102 289 102 309 125 310 147 269 157Z"
        fill="#543424" stroke="#f6bd68" strokeWidth="3.3"/>
      <path d="M262 112 281 108 295 123 296 143 264 148Z"
        fill="#221e29" stroke="#c98b43" strokeWidth="2.6"/>
      <path d="M262 118h33m-33 11h35m-28-19v39m15-39v38"
        stroke="#e6b168" strokeWidth="2.3" opacity=".92"/>
      <path d="M251 143q25-7 55-2" stroke="#ffe09a" strokeWidth="5" fill="none"/>
      <path d="M271 121h9v10h-9Zm13 0h8v10h-8Z" fill="#ffd187"
        stroke="#6b462f" strokeWidth="2"/>
      <path d="M268 121h28M264 134h37" stroke="#dba055" strokeWidth="1.4"/>
      {/* Fine brass rivets, gun-hatches and rope trim. */}
      {Array.from({length:7},(_,i)=><g key={'royal-rivet-'+i}>
        <path d={`M${91+i*24} ${148+Math.round(10*Math.sin(i*Math.PI/7))}
          l-1 7`} stroke="#221923" strokeWidth="2.2" opacity=".86"/>
        <circle cx={89+i*25} cy={179+Math.round(8*Math.sin(i*Math.PI/7))}
          r="2.8" fill="#ffe0a1" stroke="#7c4b2e" strokeWidth="1"/>
      </g>)}
      <path d="M87 169q67 19 156 11" fill="none" stroke="#0e1421"
        strokeWidth="3" strokeDasharray="1 10" strokeLinecap="round"/>
      <path d="M79 135l11-13 15 13M145 137l10-17 17 18M210 136l14-18 15 18"
        fill="none" stroke="#eac88b" strokeWidth="1.8"/>
      {/* Furled canvas folds, gold-reinforced yardarms and a crow's nest. */}
      <path d="M87 49q14 37 1 74M105 46q18 32 10 77M137 48q33 31 44 70M220 31q27 32 24 79"
        stroke="#d7d7c8" strokeWidth="2" opacity=".42" fill="none"/>
      <path d="M79 61Q100 68 119 65M79 85Q100 94 120 90M130 59Q159 61 177 85M215 45Q236 49 252 68"
        stroke="#768995" strokeWidth="1.8" fill="none" opacity=".62"/>
      <path d="M73 53L122 52M126 54L197 61M206 43L257 48M262 80L291 84"
        stroke="#9d6c3e" strokeWidth="5" strokeLinecap="round"/>
      <path d="M74 51L122 50M126 52L197 59M206 41L257 46"
        stroke="#f8d88e" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M196 36h31l-4 7h-23Z" fill="#643e26" stroke="#e9b778" strokeWidth="2"/>
      <path d="M210 17v122M117 31v110M265 67v73" stroke="#f9d292" strokeWidth="1.6"
        opacity=".72"/>
      <path d="M118 34 36 146M210 18 311 143M266 66 314 137M120 34 208 19"
        stroke="#ffdda2" strokeWidth="1.35" opacity=".72" fill="none"/>
      <path d="M120 35 63 136M212 22 172 137M266 71 237 136"
        stroke="#a5a4a0" strokeWidth="1.1" opacity=".78" fill="none"/>
      {/* More natural foam at the bow and where the curved hull meets water. */}
      <path d="M38 198q17-8 36 0t38 4q14-7 30-3m68 6q18-7 37 0t45-2"
        stroke="#d9ffff" strokeWidth="5" fill="none" strokeLinecap="round" opacity=".94"/>
      <path d="M22 211q26-6 43-2m198 2q27-5 52 2M60 221q20-4 40 0"
        stroke="#52dff4" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".85"/>
      <g fill="#eefaff" opacity=".82">
        <circle cx="46" cy="210" r="2"/><circle cx="65" cy="217" r="1.8"/>
        <circle cx="282" cy="215" r="2.5"/><circle cx="299" cy="207" r="1.8"/>
      </g>
    </g>
    {/* Painted raised bow and deep keel of Royal Crown, original SVG only. */}
    {!small&&<g className="w4-pictorial-bow" pointerEvents="none">
      <path d="M270 173Q294 169 308 153Q321 148 329 157Q319 173 306 177L290 183Z"
        fill="#2b1a1d" stroke="#a56a38" strokeWidth="3"/>
      <path d="M276 173Q305 157 313 150Q330 146 336 157Q322 165 316 170Q313 186 300 182"
        fill="none" stroke="#ffd27b" strokeWidth="5" strokeLinecap="round"/>
      <path d="M313 155q11-11 16-1t-11 13q-8 9-3 16m-4-11q-16 17-28 6"
        fill="none" stroke="#b57334" strokeWidth="3" strokeLinecap="round"/>
      <path d="M295 159q-9-16-20-18m32 9q-3-15-14-16"
        fill="none" stroke="#fff0bb" strokeWidth="2.2"/>
      <path d="M92 191Q155 217 266 193L251 207Q159 233 109 205Z"
        fill="#0f1420" opacity=".72" stroke="#d99e59" strokeWidth="2"/>
      <path d="M103 201Q173 227 248 205M98 194Q167 218 261 197"
        fill="none" stroke="#ffd28d" strokeWidth="1.8" opacity=".84"/>
      <g fill="#ffcf77"><circle cx="294" cy="166" r="2.5"/>
        <circle cx="302" cy="157" r="2"/><circle cx="314" cy="159" r="2"/></g>
    </g>}
    {/* WORK4 / screen 03: original hand-drawn wood, rigging and sail relief.
        Only vector pigment and linework: ownership, ship statistics and hit
        targets stay unchanged. The approved reference is NOT rendered as art. */}
    <g className="w4-royal-finish" pointerEvents="none">
      {/* Three curved varnished planks catch a warm edge-light beneath the gunports. */}
      <path d="M79 169Q161 193 280 166L269 184Q177 206 89 183Z"
        fill="#150f1b" opacity=".22"/>
      <path d="M81 173Q162 198 276 170M88 181Q164 204 267 182"
        fill="none" stroke="#f2b96b" strokeWidth="2.4" opacity=".92"/>
      <path d="M92 188Q168 213 256 187" fill="none" stroke="#fff0bf"
        strokeWidth="1.5" opacity=".74"/>
      <path d="M83 160Q173 180 282 153" fill="none" stroke="#211825"
        strokeWidth="3.5" opacity=".84"/>
      {/* Raised carved stern transom and real brass-framed windows. */}
      <path d="M258 111L284 102 306 126 304 147 259 150Z"
        fill="none" stroke="#ffe1a0" strokeWidth="2.6" opacity=".92"/>
      <path d="M269 117h9v10h-9Zm14 1h9v10h-9Z"
        fill="#eaa851" fillOpacity=".42" stroke="#ffe3a4" strokeWidth="1.6"/>
      <path d="M266 137q14-5 31-1M266 143q15-4 30-1"
        stroke="#f4c47d" strokeWidth="2" fill="none"/>
      {/* Rope-ladder rungs between shrouds; curves follow the existing sails. */}
      <g stroke="#ead1a3" strokeWidth="1.45" fill="none" opacity=".82">
        <path d="M116 36L89 134M213 22L188 139M212 22L243 139"/>
        <path d="M110 55l-14 2m11 9-15 2m13 9-15 2m12 9-15 2m12 9-15 2m13 11-20 3"/>
        <path d="M206 47l18 1m-20 9 23 2m-25 8 27 3m-29 7 31 4m-32 8 35 5m-35 7 37 6"/>
      </g>
      {/* Canvas seams, folds and the softer cream highlights in reference 03. */}
      <g stroke="#f8edd0" strokeWidth="1.7" fill="none" opacity=".52">
        <path d="M91 61Q84 96 91 117M106 52Q106 88 111 118"/>
        <path d="M141 54Q168 83 179 111M157 48Q182 66 192 110"/>
        <path d="M226 39Q241 68 240 108M244 47Q253 75 251 104"/>
      </g>
      <g stroke="#815b42" strokeWidth="1.35" fill="none" opacity=".65">
        <path d="M85 85q16 8 33 3M131 83q26 5 48 14M219 72q17 5 32 4"/>
      </g>
      {/* Light glints and sea foam make the hull read as three-dimensional. */}
      <path d="M35 197q17-8 33 2t32 3m131 3q23-8 43-2t41-1"
        stroke="#edffff" strokeWidth="4" strokeLinecap="round" fill="none" opacity=".9"/>
      <g fill="#fff9dd" opacity=".8">
        <circle cx="63" cy="196" r="1.8"/><circle cx="91" cy="201" r="1.5"/>
        <circle cx="296" cy="197" r="2"/><circle cx="315" cy="201" r="1.4"/>
      </g>
    </g>

    {/* WORK4/03: deep carved broadside, lit gunports and stepped stern. These
        are original vector planes; no fake boats, interactions or combat data. */}
    {!small&&<g className="w4-galleon-hull-volume" pointerEvents="none">
      <path d="M64 150Q167 169 301 139L285 177Q235 200 176 205Q127 205 91 188L69 173Z"
        fill="url(#w4-galleon-darkwood)" stroke="#8d542d" strokeWidth="3"/>
      <path d="M74 156Q173 181 291 151L285 169Q170 199 85 178Z"
        fill="#1d1a24" opacity=".75"/>
      <path d="M83 183Q166 218 274 183Q227 211 171 213Q118 208 91 195Z"
        fill="#2e2123" stroke="#bc7d43" strokeWidth="2.3"/>
      <path d="M68 151Q174 174 300 141M77 162Q176 187 290 156"
        fill="none" stroke="#e6aa62" strokeWidth="3.3" opacity=".9"/>
      <path d="M83 178Q172 207 281 175M89 191Q173 215 267 188"
        fill="none" stroke="#bf814c" strokeWidth="2.1" opacity=".93"/>
      <path d="M87 173Q183 200 282 171" fill="none" stroke="#4b2d27" strokeWidth="3"/>
      {Array.from({length:7},(_,i)=>{
        const x=99+i*25;
        const y=173+Math.round(8*Math.sin((i+1)*Math.PI/8));
        return <g key={'depth-port-'+i}>
          <path d={`M${x-8} ${y-6}q8-4 16 0v13q-8 5-16 0Z`}
            fill="#0b1420" stroke="#dbaa5e" strokeWidth="2.2"/>
          <ellipse cx={x} cy={y} rx="4.6" ry="4" fill="#121925" stroke="#e8bb72" strokeWidth="1.5"/>
          <path d={`M${x-7} ${y+10}l13 1`} stroke="#f8d391" strokeWidth="1.3"/>
        </g>;
      })}
      <path d="M75 166Q167 191 287 161" fill="none" stroke="#f6cb7b" strokeWidth="1.8"/>
      <path d="M82 185Q169 212 275 180" fill="none" stroke="#eabb78" strokeWidth="2.4"/>
      {/* Raised aft cabin with shuttered brass galleries. */}
      <path d="M252 129L265 103 285 100 303 116 311 144 289 151 254 149Z"
        fill="#322124" stroke="#e0a559" strokeWidth="3.5"/>
      <path d="M264 114L282 108 298 122 299 140 264 143Z"
        fill="#533126" stroke="#f5c77d" strokeWidth="2"/>
      <path d="M269 118h10v11h-10Zm15 0h10v11h-10Z"
        fill="#e6b865" stroke="#422824" strokeWidth="2.2"/>
      <path d="M269 118v11m15-11v11M261 136q20-7 41 0"
        fill="none" stroke="#fff0b0" strokeWidth="2.2"/>
      <path d="M259 143q21-10 47-3" fill="none" stroke="#ffda8e" strokeWidth="4"/>
      {/* Three-dimensional carved bow, warm amber lit timber ribs. */}
      <path d="M69 156Q57 160 57 176L80 190M289 163l15-17 10 7"
        fill="none" stroke="#f9cb77" strokeWidth="5" strokeLinecap="round"/>
      <path d="M49 151q-11 0-17 12m25-9q-3 10 5 17"
        fill="none" stroke="#a96730" strokeWidth="4" opacity=".93"/>
      <g fill="#ffe1a4" stroke="#6b4226" strokeWidth="1">
        <circle cx="89" cy="160" r="2"/><circle cx="131" cy="170" r="2"/>
        <circle cx="178" cy="174" r="2"/><circle cx="227" cy="170" r="2"/>
        <circle cx="272" cy="159" r="2"/>
      </g>
      <path d="M48 196q32-10 54 3t49 4m72 1q26-10 49-3t45-2"
        stroke="#c4f7fa" strokeWidth="4.5" fill="none" opacity=".92"/>
    </g>}

    {/* Multi-plane stern and lower gun deck: varnished carved timber with
        an illuminated gold rail, not overlaid screenshot pixels. */}
    {!small&&<g className="w4-galleon-sculpted-hull" pointerEvents="none">
      <path d="M83 177Q168 204 283 174L272 190Q178 219 95 192Z"
        fill="url(#w4-wood-relief)" opacity=".54"/>
      <path d="M83 180Q173 210 277 178M93 190Q169 214 266 189"
        stroke="#f0bc74" strokeWidth="2.4" fill="none" opacity=".87"/>
      <path d="M85 186Q172 214 271 184M96 196Q175 217 256 193"
        stroke="#23141b" strokeWidth="3.1" fill="none" opacity=".8"/>
      <path d="M92 159Q170 183 285 157" fill="none" stroke="#ffe5a3"
        strokeWidth="2.2" opacity=".9"/>
      <path d="M258 128L266 107 283 100 299 117 306 143"
        stroke="#ffd38c" strokeWidth="2.9" fill="none"/>
      <path d="M264 139Q286 136 301 141" stroke="#eca85b" strokeWidth="4"
        fill="none"/>
      <g fill="none" stroke="#f8ce87" strokeWidth="1.8" opacity=".89">
        <path d="M101 184q8 7 16 0t15 0M142 194q10 7 19-1t17 0M190 195q10 5 17-3t14 0"/>
        <path d="M93 173l-3 6m33 3-2 7m41-1-1 8m42-7 1 7m39-15 3 7"/>
      </g>
    </g>}
    {/* Reference 03: sculpted broadside, timber shadows and cast brass bow. */}
    {!small&&<g className="w4-galleon-relief-finish" pointerEvents="none">
      <path d="M86 165Q169 189 279 163L271 182Q176 212 91 185Z"
        fill="#120e17" opacity=".38"/>
      <path d="M91 174Q168 201 271 176M97 185Q174 208 259 185"
        fill="none" stroke="#bf7846" strokeWidth="5.5" opacity=".78"/>
      <path d="M90 171Q165 198 274 169M95 183Q174 205 263 180"
        fill="none" stroke="#ffcb80" strokeWidth="1.65" opacity=".94"/>
      <path d="M101 194Q170 216 248 193"
        fill="none" stroke="#0b0d17" strokeWidth="5" opacity=".66"/>
      <path d="M99 192Q171 211 254 191"
        fill="none" stroke="#f8ca80" strokeWidth="1.8" opacity=".82"/>
      <g stroke="#deb477" strokeWidth="1.2" fill="none" opacity=".91">
        <path d="M96 172q7 11 14 0m11 4q7 11 15 1m12 4q6 11 14 2m14 1q7 8 14 0m12-1q7 8 14-1m9-3q7 6 14-4"/>
        <path d="M95 188l6-4m23 12 7-4m25 7 7-4m27 3 7-5m28-1 6-6"/>
      </g>
      <path d="M268 132q9-15 21-12l11 17-4 7-9-7-11 8"
        fill="#2b1c20" stroke="#e2a75c" strokeWidth="3"/>
      <path d="M270 128l11-19 10 9m-21 15 23 1m-15-20 1 28"
        fill="none" stroke="#ffdd98" strokeWidth="2"/>
      <path d="M55 161q-7-5-15 4l11 2 9 13m-6-24 4-13"
        fill="none" stroke="#f4bc66" strokeWidth="4" strokeLinecap="round"/>
    </g>}
    <path d="M36 204Q65 196 103 207M218 207Q256 199 316 205" stroke="#ddfcfa" strokeWidth="4" opacity=".85" fill="none" strokeLinecap="round"/>


    {/* WORK4 18h / #104 — carved high-relief & furnace bounce light. Foreground carved prow and gun deck provide real
        perspective, not a screenshot or an additional selectable ship. */}
    {!small&&<g className="w4-hero-polish" pointerEvents="none">
      <path d="M58 145Q165 167 302 138L290 158Q182 183 77 163Z"
        fill="url(#w4-hero-wood-sheen)" stroke="#f1c57d" strokeWidth="2.7"/>
      <path d="M72 159Q169 183 291 155M79 168Q174 193 280 166"
        fill="none" stroke="#f4c37e" strokeWidth="2.5" opacity=".89"/>
      <path d="M82 178Q170 201 276 176L267 185Q173 210 92 185Z"
        fill="#211823" opacity=".8"/>
      <path d="M93 191Q172 216 265 188" fill="none"
        stroke="#e3a763" strokeWidth="3.2" opacity=".88"/>
      <g fill="#0c1721" stroke="#f8ca80" strokeWidth="2.3">
        <path d="M94 163q7-5 15 1v11q-8 4-15-1Z"/>
        <path d="M122 169q7-5 15 1v11q-8 4-15-1Z"/>
        <path d="M151 173q7-5 15 1v11q-8 4-15-1Z"/>
        <path d="M181 173q7-5 15 1v11q-8 4-15-1Z"/>
        <path d="M211 170q7-5 15 1v11q-8 4-15-1Z"/>
        <path d="M239 164q7-5 15 1v11q-8 4-15-1Z"/>
      </g>
      <path d="M71 151Q175 178 293 147" fill="none"
        stroke="#fff1ba" strokeWidth="2.7" opacity=".95"/>
      <path d="M47 147q-15-2-18 14 11-9 19-4l15 30m-8-37q2-19 12-23"
        fill="none" stroke="#e5ad62" strokeWidth="5" strokeLinecap="round"/>
      <path d="M35 167q16 6 25 26M49 145l11-15" fill="none"
        stroke="#ffe2a0" strokeWidth="2.1" opacity=".93"/>
      <path d="M252 127L263 109 283 104 305 126 306 145"
        fill="none" stroke="#ffe1a4" strokeWidth="3"/>
      <g fill="#ffd98b" stroke="#6c402b" strokeWidth="1.2">
        <circle cx="96" cy="151" r="2.2"/><circle cx="128" cy="158" r="2.2"/>
        <circle cx="161" cy="160" r="2.2"/><circle cx="196" cy="161" r="2.2"/>
        <circle cx="230" cy="157" r="2.2"/><circle cx="269" cy="151" r="2.2"/>
      </g>
      <path d="M35 201q15-8 31-2t33 5m115 0q22-6 43-1t50-3"
        fill="none" stroke="#f2ffff" strokeWidth="4" opacity=".82" strokeLinecap="round"/>
    </g>}
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
  {/* Tropical horizon in several depth planes, behind the main live ship. */}
  <g className="w4-tropical-distance" pointerEvents="none">
    <path d="M125 188Q150 164 175 175Q196 157 215 172Q236 153 257 177
      Q288 168 318 191L358 208L125 220Z" fill="#174657" opacity=".7"/>
    <path d="M120 193Q155 169 181 183Q203 165 222 179Q253 164 274 191
      Q295 184 343 207L121 211Z" fill="#488e65" opacity=".86"/>
    <path d="M134 196q25-20 46-4m20-5q27-17 47-1m13 9q26-10 47 3"
      fill="none" stroke="#a0cf89" strokeWidth="3" opacity=".68"/>
    <path d="M128 210Q233 198 346 208" stroke="#c3ffff" strokeWidth="3"
      fill="none" opacity=".55"/>
  </g>
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
  {/* The approved shore is a lush rocky cove rather than bare sand. */}
  <g className="w4-tropical-shore" pointerEvents="none">
    <path d="M0 250L21 217 34 226 47 205 60 231 73 232 90 265 0 285Z"
      fill="#67513a" stroke="#c8a277" strokeWidth="2.8"/>
    <path d="M0 263L27 240 52 254 67 244 90 271L0 285Z"
      fill="#324539" opacity=".87"/>
    <path d="M0 277q31-13 63-2t57 1M295 272q41-8 76-1t49-1"
      fill="none" stroke="#dbffff" strokeWidth="4" opacity=".68"/>
    <g fill="#548b51" stroke="#306340" strokeWidth="1.4">
      <path d="M32 234q-8-25-31-21 18 10 30 28Z"/>
      <path d="M34 234q-2-31 14-42-4 28-13 48Z"/>
      <path d="M37 235q11-22 35-20-20 14-32 24Z"/>
    </g>
    <path d="M8 229q18-14 29-1m5-13q8-8 17 2" fill="none"
      stroke="#ead3a7" strokeWidth="2.7"/>
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
   <radialGradient id="w4-foundry-amber-falloff" cx=".45" cy=".58" r=".68">
     <stop stopColor="#ffdc83" stopOpacity=".56"/>
     <stop offset=".32" stopColor="#fa883b" stopOpacity=".36"/>
     <stop offset="1" stopColor="#c24426" stopOpacity="0"/>
   </radialGradient>
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
    {/* WORK4 / approved 04: independent vector workshop detailing. This adds
        dimensional timber, visible arch stones, hanging hardware and embers;
        it never replaces the real interface with a reference screenshot. */}
    <g className="w4-forge-approved-workshop-detail" pointerEvents="none">
      <path d="M0 16h419M0 26h418" stroke="#392321" strokeWidth="8" opacity=".7"/>
      <path d="M0 19h420" stroke="#e1a76b" strokeWidth="3" opacity=".83"/>
      <path d="M171 2L23 95M191 0L28 111" stroke="#3f2925" strokeWidth="11" opacity=".82"/>
      <path d="M170 2L24 95M190 0L29 110" stroke="#efb674" strokeWidth="2.8" opacity=".83"/>
      <path d="M18 52l39 22M22 62l30 17M181 35l-33 21"
        stroke="#c18b57" strokeWidth="5" opacity=".6"/>
      <path d="M10 142Q23 45 109 38Q186 41 189 146"
        fill="none" stroke="#342321" strokeWidth="14"/>
      <path d="M12 142Q27 47 109 40Q181 43 187 146"
        fill="none" stroke="#f5bb72" strokeWidth="4"/>
      <path d="M23 143Q36 62 107 61Q160 62 171 147"
        fill="none" stroke="#714831" strokeWidth="8"/>
      <path d="M23 145l16 6m1-48 17 11m16-48 7 17m35-16-1 17m32-1-8 14m30 27-17 6"
        stroke="#ffdf98" strokeWidth="3.6" opacity=".64"/>
      <path d="M18 171h24m-22 18h26m-26 20h28m-30 19h28M154 168h34m-32 19h35m-32 20h37m-34 21h33"
        stroke="#b98456" strokeWidth="3" opacity=".65"/>
      <path d="M204 21l3 214m165-215-3 217"
        stroke="#211b21" strokeWidth="21" opacity=".5"/>
      <path d="M205 22l3 207m161-206-3 207" stroke="#b47c4b" strokeWidth="4" opacity=".7"/>
      <path d="M210 62l162 105m-163 0L368 60"
        stroke="#2a211f" strokeWidth="12" opacity=".63"/>
      <path d="M211 63l159 105m-162 0L367 63"
        stroke="#e1a267" strokeWidth="3.2" opacity=".58"/>
      <path d="M28 52v38m3-36-1 39" stroke="#231f1e" strokeWidth="2"/>
      <path d="M25 86h13l4 13-6 10H24l-6-10Z"
        fill="#604226" stroke="#f8d38b" strokeWidth="2.5"/>
      <path d="M27 91h9v9h-9Z" fill="#ffcd64"/>
      <path d="M23 107h19" stroke="#d9904b" strokeWidth="3"/>
      <path d="M148 15v39m9-39v44" stroke="#bda17e" strokeWidth="2.5"/>
      <circle cx="153" cy="62" r="12" fill="#533b30" stroke="#e1ac69" strokeWidth="4"/>
      <circle cx="153" cy="62" r="5" fill="#202124" stroke="#ebbb79" strokeWidth="2"/>
      <path d="M145 70l-8 31" stroke="#c4a78a" strokeWidth="2.5"/>
      <g fill="#ffd08a" opacity=".92">
        <circle cx="100" cy="127" r="2.8"/><circle cx="91" cy="156" r="2.1"/>
        <circle cx="118" cy="137" r="2.6"/><circle cx="132" cy="178" r="1.8"/>
        <circle cx="80" cy="191" r="2.8"/><circle cx="104" cy="165" r="2"/>
      </g>
      <g stroke="#f4ca80" strokeWidth="2.3" fill="none" opacity=".85">
        <path d="M86 173q-5-13 0-19m33-7q-6-12-1-22"/>
        <path d="M49 230q23 7 42 4m141 10 60 1"/>
      </g>
    </g>

    {/* Reference 04: additional foreground masonry joints, firelight and
        workshop timber. This is behind the real foreground cannon and card. */}
    <g className="w4-forge-lit-materials" pointerEvents="none">
      <path d="M20 147Q27 51 108 45Q181 47 184 149"
        fill="none" stroke="#f6bb77" strokeWidth="3.5" opacity=".75"/>
      <path d="M41 89l22 13m21-32 13 14m31-10-7 14m26 9-17 10"
        stroke="#ffdc98" strokeWidth="3" opacity=".6"/>
      <path d="M13 168h34m-33 22h34m-34 22h34m101-41h38m-37 21h36m-36 23h39"
        stroke="#dfa264" strokeWidth="3" opacity=".64"/>
      <path d="M17 143v26m30-22v22m31-82v23m29-50v26m35 8v24"
        stroke="#54352a" strokeWidth="5" opacity=".5"/>
      <path d="M0 279L420 264M0 286L420 274"
        stroke="#f0b573" strokeWidth="3" opacity=".6"/>
      <path d="M174 3l-38 32M214 7l-42 39"
        stroke="#e2ae6d" strokeWidth="4" opacity=".59"/>
      <path d="M11 55h14l7 24-10 16-13-8Z"
        fill="#82552c" stroke="#ffc27c" strokeWidth="2.5"/>
      <path d="M17 65h6v13h-6Z" fill="#ffdd95"/>
      <g fill="#ffe8aa" opacity=".83">
        <circle cx="82" cy="181" r="2.5"/><circle cx="103" cy="152" r="2.2"/>
        <circle cx="129" cy="206" r="1.9"/><circle cx="72" cy="225" r="2.3"/>
      </g>
    </g>
    {/* WORK4 / reference 04: secondary warm masonry, hammered fittings and
        sparks. This is behind the cannon and the real upgrade controls. */}
    <g className="w4-forge-warm-materials" pointerEvents="none">
      <path d="M25 142Q35 49 107 46Q169 44 180 144"
        stroke="#f3c087" strokeWidth="2.5" fill="none" opacity=".92"/>
      <path d="M39 114l18 6m-10-27 22 9m10-27 16 10m27-12-6 11m30-1-13 12m24 17-20 4"
        stroke="#ffdb9c" strokeWidth="2.6" opacity=".72"/>
      <path d="M33 153h141m-136 19h131m-126 19h129m-128 20h132"
        stroke="#291b1c" strokeWidth="2.5" opacity=".55"/>
      <path d="M50 152v20m45-19v19m45-20v19M67 174v17m57-17v17M48 194v17m46-18v18m51-19v18"
        stroke="#e6a66b" strokeWidth="2.8" opacity=".62"/>
      <path d="M0 253L420 245M0 272L420 265"
        stroke="#f7b66e" strokeWidth="2.5" opacity=".62"/>
      <path d="M204 22h166m-164 31h161m-159 32h156"
        stroke="#f3b978" strokeWidth="2.1" opacity=".52"/>
      <g fill="#ffdb89">
        <circle cx="81" cy="164" r="2"/><circle cx="102" cy="141" r="1.5"/>
        <circle cx="119" cy="172" r="2.3"/><circle cx="144" cy="202" r="1.4"/>
      </g>
      <g stroke="#fff0b3" strokeWidth="2" fill="none" opacity=".83">
        <path d="M96 185l5-8m11 15 8-12m-29 32-4-9m39-14 4-8"/>
      </g>
      <path d="M16 224q13-6 22 0m313 20q31-8 53-2"
        fill="none" stroke="#3a2525" strokeWidth="5" opacity=".78"/>
    </g>
   {/* Brick-lined hearth and warm refractions across the stone arch.
       All decorative geometry remains behind the real selectable controls. */}
   <g className="w4-foundry-pictorial-light" pointerEvents="none">
     <path d="M49 251V149Q59 83 108 80Q151 82 162 150V256Z"
       fill="#1d181b" opacity=".38"/>
     <path d="M55 248V158Q67 102 108 101Q148 105 152 158V249Z"
       fill="#c44d28" opacity=".28"/>
     <path d="M61 245q7-43 30-44 2-18 16-19 0 34 21 34 8-22 13-29 13 41 1 58Z"
       fill="#fc7b31" opacity=".64"/>
     <path d="M72 245q4-25 17-34-2 24 17 25 8-29 17-38-5 30 10 44Z"
       fill="#ffda7c" opacity=".78"/>
     <path d="M45 148Q57 71 108 72Q169 76 177 150"
       fill="none" stroke="#3f2925" strokeWidth="16"/>
     <path d="M47 148Q59 73 109 74Q162 76 174 150"
       fill="none" stroke="#ffd09a" strokeWidth="4.3"/>
     <path d="M50 143l18 9m-6-48 18 14m18-41 7 21m26-14-10 19m29 5-17 11"
       fill="none" stroke="#fff0bd" strokeWidth="2.7" opacity=".75"/>
     <path d="M36 158h30m-30 22h25m-25 24h21m90-46h29m-30 23h29m-29 23h30"
       fill="none" stroke="#f1b377" strokeWidth="3" opacity=".66"/>
     <path d="M0 257Q195 229 420 246M0 279Q194 253 420 264"
       fill="none" stroke="#ffc785" strokeWidth="2.7" opacity=".53"/>
     <g fill="#fff0b3" opacity=".86"><circle cx="82" cy="172" r="2"/>
       <circle cx="101" cy="159" r="1.9"/><circle cx="134" cy="174" r="2.4"/>
       <circle cx="118" cy="199" r="1.7"/><circle cx="150" cy="207" r="2.4"/></g>
   </g>

   {/* WORK4 18h / #104 — carved high-relief & furnace bounce light. Arch stones pick up furnace light while the cannon
       remains separate, scalable artwork and the status card remains live. */}
   <g className="w4-foundry-amber-bounce" pointerEvents="none">
     <ellipse cx="106" cy="204" rx="105" ry="105" fill="url(#w4-foundry-amber-falloff)"/>
     <path d="M25 140Q36 53 107 52Q167 54 178 146" fill="none"
       stroke="#f4bb75" strokeWidth="5" opacity=".85"/>
     <path d="M28 144Q43 63 106 61Q161 61 173 147" fill="none"
       stroke="#4e3428" strokeWidth="10" opacity=".75"/>
     <path d="M35 106l18 14m9-41 17 18m29-32-2 22m29-14-11 20m27 9-17 13"
       fill="none" stroke="#f6d09a" strokeWidth="3.2" opacity=".9"/>
     <g fill="#6e4432" stroke="#dea16c" strokeWidth="2">
       <path d="M35 149h28v24H34Z"/><path d="M64 150h32v23H64Z"/>
       <path d="M98 151h34v22H98Z"/><path d="M134 150h31v23h-31Z"/>
       <path d="M41 176h33v20H40Z"/><path d="M76 176h32v20H76Z"/>
       <path d="M111 175h34v21h-34Z"/>
     </g>
     <g fill="none" stroke="#ffe1a2" strokeWidth="2.1" opacity=".65">
       <path d="M38 150h23m7 1h26m9 1h24m11-1h23"/>
       <path d="M45 178h26m8-1h27m8-1h29"/>
     </g>
     <path d="M10 265Q145 233 284 250" fill="none"
       stroke="#ffc47a" strokeWidth="4" opacity=".54"/>
     <g fill="#ffdc93" opacity=".89">
       <circle cx="84" cy="163" r="2"/><circle cx="117" cy="181" r="2.7"/>
       <circle cx="95" cy="143" r="1.8"/><circle cx="138" cy="193" r="2"/>
     </g>
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

    {/* Bronze and iron bevels catch the furnace, with no invented upgrade. */}
    <g className="w4-cannon-pictorial-metal" pointerEvents="none">
      <path d="M111 144L282 101 313 151 145 193Z"
        fill="#172738" fillOpacity=".2" stroke="#e3c7a1" strokeWidth="2"/>
      <path d="M126 144L279 108M144 183L305 148" fill="none"
        stroke="#f6e6c0" strokeWidth="2.2" opacity=".72"/>
      <path d="M139 152L273 119M158 176L302 142" fill="none"
        stroke="#273b47" strokeWidth="4.3" opacity=".85"/>
      <path d="M190 125l16 51m54-66 13 54" fill="none"
        stroke="#ffd28b" strokeWidth="7" opacity=".47"/>
      <path d="M86 229L280 184 347 211 161 261"
        fill="none" stroke="#f5c27b" strokeWidth="2.5" opacity=".87"/>
      <path d="M48 165q-11 20-3 42M59 153q-15 33-2 64"
        fill="none" stroke="#f9e8b2" strokeWidth="2.4" opacity=".83"/>
    </g>
    {/* WORK4/04: cooler cast-iron barrel, warm foundry highlights and the
        heavy timber/carriage read in perspective; all artwork, no new stats. */}
    <g className="w4-cannon-cast-depth" pointerEvents="none">
      <path d="M119 143L285 104 309 152 147 194Z"
        fill="#132635" opacity=".55"/>
      <path d="M122 139L281 105M143 182L309 148"
        fill="none" stroke="#cadce0" strokeWidth="4" opacity=".7"/>
      <path d="M137 146L280 113M160 183L299 145"
        fill="none" stroke="#020f1e" strokeWidth="4.4" opacity=".76"/>
      <path d="M180 129l15 53m44-63 14 49" stroke="#d2a266"
        strokeWidth="8" opacity=".9"/>
      <path d="M183 127l15 51m43-63 15 50" stroke="#513826"
        strokeWidth="2.5" opacity=".95"/>
      <path d="M88 228L289 181 351 209 158 260"
        fill="none" stroke="#8b603b" strokeWidth="7" opacity=".84"/>
      <path d="M103 235L285 193 341 211 157 254"
        fill="none" stroke="#f7cc86" strokeWidth="3.2" opacity=".87"/>
      <path d="M244 221a33 33 0 0 1 66-1" fill="none"
        stroke="#f3c77b" strokeWidth="3" opacity=".81"/>
      <g stroke="#ffe9a8" strokeWidth="1.6" opacity=".67">
        <path d="M63 151q-27 36-12 63M83 146q-8 37-3 73"/>
        <path d="M105 180l153-41M111 191l160-41"/>
      </g>
      <g fill="#ffe0a5">
        <circle cx="133" cy="144" r="2.2"/><circle cx="171" cy="134" r="2.2"/>
        <circle cx="213" cy="124" r="2.2"/><circle cx="254" cy="115" r="2.2"/>
      </g>
    </g>
    {/* WORK4 / reference 04: original engraved ironwork and brass/carriage
        reflections. Decorative paths only; actual upgrade state is unchanged. */}
    <g className="w4-cannon-approved-fittings" pointerEvents="none">
      <path d="M118 132L283 95M117 137l173-39"
        stroke="#fff0c0" strokeWidth="2" opacity=".65"/>
      <path d="M105 173l187-46M106 182l181-44"
        stroke="#6d8090" strokeWidth="2.4" opacity=".76"/>
      <path d="M148 147l18 39m52-56 15 43m50-57 13 34"
        stroke="#f4d9a0" strokeWidth="2" opacity=".77"/>
      <path d="M140 157l9 18m60-32 8 19m53-35 9 17"
        stroke="#3e3130" strokeWidth="2.7" opacity=".9"/>
      <path d="M73 230l80 35 160-52"
        stroke="#f7bf6f" strokeWidth="3.5" fill="none" opacity=".82"/>
      <path d="M92 237l44 18m48-4 84-25"
        stroke="#2f2622" strokeWidth="4" opacity=".88"/>
      <circle cx="277" cy="217" r="39" fill="none" stroke="#69412c" strokeWidth="3"/>
      <circle cx="277" cy="217" r="29" fill="none" stroke="#ffe1a0" strokeWidth="2" opacity=".8"/>
      <path d="M245 189l64 57m-64-3 64-52"
        stroke="#f4c17d" strokeWidth="2" opacity=".75"/>
      <g fill="#ffe0a3" stroke="#67462a" strokeWidth="1.3">
        <circle cx="120" cy="244" r="3"/><circle cx="149" cy="255" r="3"/>
        <circle cx="207" cy="231" r="3"/><circle cx="316" cy="207" r="3"/>
        <circle cx="280" cy="172" r="3"/>
      </g>
    </g>
    {/* Ref. 04 material pass: cold gunmetal reflections vs. forged gold
        trim, highlights follow the existing perspective; decorative SVG only. */}
    <g className="w4-cannon-metal-patina" pointerEvents="none">
      <path d="M108 158L284 113M110 166l173-43"
        fill="none" stroke="#e1eff0" strokeWidth="3" opacity=".59"/>
      <path d="M123 191l169-44M132 197l171-45"
        fill="none" stroke="#030e1c" strokeWidth="4" opacity=".48"/>
      <path d="M176 125l15 52M221 114l17 49M271 103l14 52"
        stroke="#fff0bd" strokeWidth="2" opacity=".84"/>
      <path d="M94 147q-16 13-19 54"
        fill="none" stroke="#fff4c8" strokeWidth="3.7" opacity=".85"/>
      <path d="M42 172q-9 21 3 36M53 147q-15 10-19 28"
        fill="none" stroke="#fff1c0" strokeWidth="2" opacity=".68"/>
      <path d="M100 242l50 23 174-54M128 248l44 11"
        stroke="#f5c37a" strokeWidth="2.8" fill="none" opacity=".83"/>
      <path d="M255 193q21-9 39 0M243 210q36-16 68 1"
        stroke="#ffdf9d" strokeWidth="2" fill="none" opacity=".75"/>
      <g fill="#f9d28c" stroke="#8d5b32" strokeWidth="1">
        <circle cx="155" cy="135" r="2.3"/><circle cx="198" cy="124" r="2.3"/>
        <circle cx="247" cy="111" r="2.3"/><circle cx="148" cy="189" r="2.3"/>
        <circle cx="203" cy="172" r="2.3"/><circle cx="253" cy="159" r="2.3"/>
        <circle cx="116" cy="237" r="2.3"/><circle cx="187" cy="225" r="2.3"/>
      </g>
    </g>

    {/* Reference 04: reflected furnace light on the live cast-iron cannon,
        wooden wheel and carriage. Decorative highlights, no invented stats. */}
    <g className="w4-cannon-sculpted-metal" pointerEvents="none">
      <path d="M108 148L286 105L305 149L143 193Z"
        fill="#071622" fillOpacity=".23"/>
      <path d="M106 145Q197 126 285 104M119 151L284 113"
        stroke="#dce5df" strokeWidth="4" fill="none" opacity=".75"/>
      <path d="M112 161L290 120M126 176L299 137"
        stroke="#0d1b28" strokeWidth="5" fill="none" opacity=".67"/>
      <path d="M187 129l14 50m36-60 14 47"
        stroke="#f5c87c" strokeWidth="6.5" opacity=".68"/>
      <path d="M190 129l14 45m36-57 14 45"
        stroke="#3b2b2a" strokeWidth="2.2"/>
      <path d="M54 161Q37 189 53 210M70 151Q56 186 70 218"
        stroke="#fff1c2" strokeWidth="3.3" fill="none" opacity=".75"/>
      <path d="M95 243L161 268L354 216M113 239L158 256L338 212"
        stroke="#eab775" strokeWidth="3.3" fill="none" opacity=".86"/>
      <circle cx="277" cy="218" r="41" stroke="#1e1a20" strokeWidth="5"
        fill="none" opacity=".8"/>
      <circle cx="277" cy="218" r="33" stroke="#ffd796" strokeWidth="3"
        fill="none" opacity=".86"/>
      <path d="M235 212Q268 169 310 201" stroke="#fff1b9"
        strokeWidth="3" fill="none" opacity=".69"/>
    </g>
    {/* Ref. 04: worn cast-iron grooves, warm firelight and recessed carriage. */}
    <g className="w4-cannon-rimlight" pointerEvents="none">
      <path d="M119 144Q205 124 284 104" fill="none"
        stroke="#eddbc0" strokeWidth="2.6" opacity=".8"/>
      <path d="M131 169Q220 146 295 124" fill="none"
        stroke="#0a1d2c" strokeWidth="3.5" opacity=".77"/>
      <path d="M135 182Q219 159 304 138" fill="none"
        stroke="#c39256" strokeWidth="2" opacity=".72"/>
      <path d="M99 141Q81 156 82 174M43 169Q34 181 39 197"
        fill="none" stroke="#ffe6ac" strokeWidth="2.8" opacity=".78"/>
      <path d="M93 229L152 252L339 207M111 237L155 245L321 207"
        fill="none" stroke="#f5bd77" strokeWidth="2.4" opacity=".83"/>
      <path d="M248 207q24-21 49 0M247 220q26-21 58 0"
        fill="none" stroke="#493023" strokeWidth="3.1" opacity=".7"/>
    </g>
    <path d="M36 236Q64 226 83 240M353 234Q380 219 397 235" stroke="#fbcc7b" strokeWidth="3" fill="none" opacity=".7"/>

    {/* Final forged-metal light band: perspective follows the existing
        live cannon shape, without increasing its physical bounding box. */}
    <g className="w4-cannon-forged-sheen" pointerEvents="none">
      <path d="M114 145L280 105M128 153L295 115"
        fill="none" stroke="#fff0c7" strokeWidth="2.8" opacity=".75"/>
      <path d="M148 183L307 147" fill="none" stroke="#090f1a"
        strokeWidth="4.3" opacity=".67"/>
      <path d="M182 128l15 47m40-58 14 51"
        fill="none" stroke="#edb96c" strokeWidth="7.5" opacity=".77"/>
      <path d="M183 130l14 44m40-57 14 49"
        fill="none" stroke="#ffe5ab" strokeWidth="1.9" opacity=".83"/>
      <path d="M49 167q-10 15-5 33m15-40q-11 23-4 44"
        fill="none" stroke="#f9e6b0" strokeWidth="2.3" opacity=".9"/>
    </g>
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
