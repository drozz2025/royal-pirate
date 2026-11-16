import React from 'react';
import { PirateIcon } from './app-icons';
import { MISSIONS, battlesPlayed, canClaimDaily, nextDailyStreak, levelFor, missionProgress, type LocalProfile, type MissionId } from './progression';


/* Original vector artwork for the mobile mosaic. Decorative only; player values remain local. */
type W8ArtKind='chest'|'scroll'|'cannon'|'helm'|'trophy'|'medal'|'flag'|'swords'|'ship'|'target';
function W8Art({kind}:{kind:W8ArtKind}){
  return <svg className={'w8-art w8-art-'+kind} width="92" height="92" viewBox="0 0 112 112" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="w8-gold-metal" x1="16" y1="0" x2="90" y2="112" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFF6B6"/><stop offset=".27" stopColor="#FFD66A"/><stop offset=".62" stopColor="#D68C27"/><stop offset="1" stopColor="#82431C"/>
      </linearGradient>
      <linearGradient id="w8-wood" x1="10" y1="10" x2="90" y2="110" gradientUnits="userSpaceOnUse">
        <stop stopColor="#E98550"/><stop offset=".53" stopColor="#A83A38"/><stop offset="1" stopColor="#5F2029"/>
      </linearGradient>
      <linearGradient id="w8-royal-blue" x1="0" y1="0" x2="112" y2="112" gradientUnits="userSpaceOnUse">
        <stop stopColor="#3FB9D4"/><stop offset=".5" stopColor="#25639C"/><stop offset="1" stopColor="#122749"/>
      </linearGradient>
    </defs>
    {kind==='chest'&&<g strokeLinejoin="round" strokeLinecap="round">
      <ellipse cx="56" cy="100" rx="46" ry="8" fill="#031629" opacity=".4"/>
      <path d="M16 51Q16 24 56 21Q96 24 96 51V60H16V51Z" fill="url(#w8-wood)" stroke="#65352E" strokeWidth="5"/>
      <path d="M20 48Q24 27 56 27Q88 27 92 48" stroke="url(#w8-gold-metal)" strokeWidth="8"/>
      <path d="M34 27V53M78 27V53" stroke="#FFD879" strokeWidth="7"/>
      <path d="M15 53H97V91Q56 105 15 91V53Z" fill="url(#w8-wood)" stroke="#572B29" strokeWidth="5"/>
      <path d="M20 58H92M20 90Q56 101 92 90M27 57V95M85 57V95" stroke="url(#w8-gold-metal)" strokeWidth="7"/>
      <rect x="44" y="53" width="24" height="27" rx="5" fill="url(#w8-gold-metal)" stroke="#7E481E" strokeWidth="3"/>
      <path d="M56 61V73" stroke="#643713" strokeWidth="5"/>
      <path d="M10 22L14 13L18 22L27 26L18 30L14 39L10 30L1 26L10 22Z" fill="#FFF1A4"/>
      <path d="M94 15L97 8L100 15L107 18L100 21L97 28L94 21L87 18L94 15Z" fill="#FFDB66"/>
    </g>}
    {kind==='scroll'&&<g strokeLinejoin="round" strokeLinecap="round">
      <path d="M20 14Q36 18 52 14L81 18V92Q57 88 32 94L24 88V27Q14 28 16 20Z" fill="#F6D9A0" stroke="#8B5631" strokeWidth="5"/>
      <path d="M20 17H82Q93 17 91 30Q90 38 81 39H30Q20 38 20 29Q10 28 12 20Q14 14 20 17Z" fill="url(#w8-gold-metal)" stroke="#84512B" strokeWidth="4"/>
      <path d="M24 85H81Q93 85 94 96Q95 104 84 103H23Q11 103 13 94Q14 86 24 85Z" fill="url(#w8-gold-metal)" stroke="#84512B" strokeWidth="4"/>
      <path d="M34 49H69M34 59H67M34 69H57" stroke="#956539" strokeWidth="5"/>
      <circle cx="76" cy="69" r="18" fill="url(#w8-royal-blue)" stroke="#FBE099" strokeWidth="5"/>
      <path d="M66 69L73 77L86 61" stroke="#FBE099" strokeWidth="6"/>
    </g>}
    {kind==='swords'&&<g strokeLinejoin="round" strokeLinecap="round">
      <path d="M19 19L48 48M93 19L64 48" stroke="#D1E9F1" strokeWidth="9"/>
      <path d="M16 13L36 18L52 45L45 52L18 36Z" fill="#EAF7FF" stroke="#6E93AB" strokeWidth="4"/>
      <path d="M96 13L76 18L60 45L67 52L94 36Z" fill="#EAF7FF" stroke="#6E93AB" strokeWidth="4"/>
      <path d="M42 47L86 91M70 47L26 91" stroke="#D2A052" strokeWidth="12"/>
      <path d="M33 44L49 60M63 60L79 44" stroke="url(#w8-gold-metal)" strokeWidth="9"/>
      <path d="M80 85L92 97M32 85L20 97" stroke="#734125" strokeWidth="12"/>
      <circle cx="56" cy="56" r="8" fill="url(#w8-gold-metal)" stroke="#9C642F" strokeWidth="3"/>
    </g>}
    {kind==='ship'&&<g strokeLinejoin="round" strokeLinecap="round">
      <path d="M13 71Q55 87 99 69L86 90Q55 104 25 89Z" fill="#9D4C34" stroke="#F4D28C" strokeWidth="5"/>
      <path d="M56 13V83" stroke="#8B5A38" strokeWidth="7"/>
      <path d="M51 20L24 62L50 62Z" fill="#F2E2BD" stroke="#CBA460" strokeWidth="3"/>
      <path d="M61 22L88 64L61 64Z" fill="#E4B975" stroke="#B7803E" strokeWidth="3"/>
      <path d="M56 16L79 21L56 28Z" fill="#C84D44" stroke="#F0C780" strokeWidth="2"/>
      <circle cx="43" cy="83" r="4" fill="#132C49" stroke="#F3D184" strokeWidth="2"/>
      <circle cx="65" cy="84" r="4" fill="#132C49" stroke="#F3D184" strokeWidth="2"/>
      <path d="M8 99Q21 93 34 99T59 99T84 99T108 99" stroke="#5CDBE6" strokeWidth="4"/>
    </g>}
    {kind==='target'&&<g strokeLinejoin="round" strokeLinecap="round">
      <circle cx="54" cy="59" r="39" fill="#F6E5C0" stroke="url(#w8-gold-metal)" strokeWidth="7"/>
      <circle cx="54" cy="59" r="27" fill="#CB513F" stroke="#FFEFBC" strokeWidth="5"/>
      <circle cx="54" cy="59" r="15" fill="#F4DA9D" stroke="#F3D78D" strokeWidth="3"/>
      <circle cx="54" cy="59" r="6" fill="#C93D32"/>
      <path d="M95 14L57 56" stroke="#164269" strokeWidth="7"/>
      <path d="M94 14L103 19L93 29" fill="#F4D68F" stroke="#83512D" strokeWidth="3"/>
      <path d="M95 14L87 8L87 22Z" fill="#59BDE1" stroke="#174D78" strokeWidth="2"/>
      <path d="M56 56L42 72" stroke="#F2F5EB" strokeWidth="5"/>
    </g>}
    {kind==='cannon'&&<g strokeLinejoin="round" strokeLinecap="round">
      <path d="M22 73L78 73L85 85L20 85Z" fill="url(#w8-wood)" stroke="#693823" strokeWidth="5"/>
      <circle cx="32" cy="86" r="13" fill="#8D4D2D" stroke="url(#w8-gold-metal)" strokeWidth="6"/>
      <circle cx="76" cy="86" r="13" fill="#8D4D2D" stroke="url(#w8-gold-metal)" strokeWidth="6"/>
      <path d="M16 43L74 32L88 45L32 64Z" fill="url(#w8-royal-blue)" stroke="#0B2446" strokeWidth="6"/>
      <path d="M76 30L94 35L97 53L86 56L77 47Z" fill="url(#w8-gold-metal)" stroke="#784A26" strokeWidth="4"/>
      <path d="M27 45L36 61" stroke="#F8CE74" strokeWidth="8"/>
      <path d="M100 18L103 26L111 30L103 34L100 42L97 34L89 30L97 26Z" fill="#FFD975"/>
    </g>}
    {kind==='helm'&&<g strokeLinejoin="round" strokeLinecap="round" stroke="#8C572C">
      <circle cx="56" cy="56" r="37" stroke="url(#w8-gold-metal)" strokeWidth="10"/>
      <path d="M56 3V109M3 56H109M18 18L94 94M18 94L94 18" stroke="url(#w8-gold-metal)" strokeWidth="9"/>
      <path d="M56 21V91M21 56H91M31 31L81 81M31 81L81 31" stroke="#79441E" strokeWidth="4"/>
      <circle cx="56" cy="56" r="14" fill="url(#w8-royal-blue)" stroke="#F9D681" strokeWidth="6"/>
      <path d="M51 57L56 47L61 57L56 65Z" fill="#FFD974" stroke="none"/>
    </g>}
    {(kind==='trophy'||kind==='medal')&&<g strokeLinejoin="round" strokeLinecap="round">
      <path d="M29 26L19 17L10 23L17 37L29 44M83 26L93 17L102 23L95 37L83 44" stroke="#F3CA67" strokeWidth="7"/>
      <path d="M32 22H80L75 58Q71 70 56 74Q41 70 37 58Z" fill="url(#w8-gold-metal)" stroke="#894C20" strokeWidth="5"/>
      <path d="M55 73V86M37 89H75L81 100H31Z" fill="url(#w8-gold-metal)" stroke="#894C20" strokeWidth="6"/>
      <path d="M42 41L49 37L56 24L63 37L70 41L64 48L66 59L56 53L46 59L48 48Z" fill="#FDF5B5" stroke="#C98528" strokeWidth="3"/>
      <path d="M16 62L9 57M15 74L5 73M96 62L103 57M97 74L107 73" stroke="#6DD9BB" strokeWidth="5"/>
    </g>}
    {kind==='flag'&&<g strokeLinejoin="round" strokeLinecap="round">
      <path d="M26 13V104" stroke="url(#w8-gold-metal)" strokeWidth="9"/>
      <path d="M30 20Q50 5 76 22L96 16L87 59Q57 45 30 65Z" fill="url(#w8-royal-blue)" stroke="#F3CC7A" strokeWidth="5"/>
      <path d="M48 33L56 42L76 25" stroke="#FBE69D" strokeWidth="7"/>
      <path d="M12 102H41" stroke="#F6D68A" strokeWidth="7"/>
    </g>}
  </svg>;
}


/** Decorative maritime panorama drawn in SVG, not a screenshot or gameplay layer. */
function W8SeaBackdrop({variant}:{variant:'missions'|'ranking'}){
  return <svg className={'w8-seascape w8-seascape-'+variant} viewBox="0 0 420 176" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="w8-sea-sky" x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#2D94B8"/><stop offset=".58" stopColor="#19638A"/><stop offset="1" stopColor="#0A3156"/>
      </linearGradient>
      <linearGradient id="w8-sea-waves" x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#2A88A5"/><stop offset="1" stopColor="#072B4B"/>
      </linearGradient>
    </defs>
    <rect width="420" height="176" fill="url(#w8-sea-sky)"/>
    <g fill="#E7FBFF" opacity=".68">
      <path d="M25 30c8-12 21-15 31-8 11-17 31-14 39 0 14-6 26 1 29 11H25Z"/>
      <path d="M254 21c13-12 24-10 30-4 12-11 27-6 31 3 12-3 20 4 22 11h-83Z"/>
      <path d="M166 42c9-7 17-6 23-1 8-8 20-4 23 3h-46Z" opacity=".57"/>
    </g>
    <g stroke="#63492E" strokeLinecap="round" strokeLinejoin="round" opacity=".83">
      <path d="M49 120Q64 76 48 33" strokeWidth="9" fill="none"/>
      <path d="M48 36Q13 20 4 42Q30 40 48 36M48 36Q31 6 11 10Q28 30 48 36M48 36Q58 4 88 10Q62 25 48 36M48 36Q87 17 102 34Q73 29 48 36M48 36Q77 36 85 57Q64 48 48 36" fill="#23765E" stroke="#0A644B" strokeWidth="2"/>
      <path d="M366 110Q346 62 364 29" strokeWidth="9" fill="none"/>
      <path d="M363 30Q338 6 313 17Q337 29 363 30M363 30Q370 3 396 12Q379 26 363 30M363 30Q398 23 417 46Q385 41 363 30M363 30Q341 35 330 57Q353 45 363 30" fill="#338260" stroke="#0A644B" strokeWidth="2"/>
    </g>
    <circle cx="341" cy="38" r="28" fill="#FFE6A1" opacity=".36"/>
    <circle cx="341" cy="38" r="41" fill="none" stroke="#FFE6A1" strokeWidth="1.5" opacity=".19"/>
    <path d="M0 111L42 91L70 101L101 75L142 103L177 93L214 113L256 99L291 104L329 85L368 101L420 82V176H0Z" fill="#164D67"/>
    <path d="M0 124Q55 115 104 125T212 125T318 121T420 127V176H0Z" fill="url(#w8-sea-waves)"/>
    <g fill="none" stroke="#84D7DE" strokeWidth="2.2" opacity=".32">
      <path d="M-10 143Q31 135 76 143T166 143T256 143T346 143T436 143"/>
      <path d="M-10 159Q31 151 76 159T166 159T256 159T346 159T436 159"/>
      <path d="M220 129Q247 124 267 129M294 139Q308 137 324 139M361 146Q381 140 406 146"/>
    </g>
    <g opacity=".64">
      <path d="M280 117L300 54V118Z" fill="#09243F" stroke="#E4B865" strokeWidth="1.5"/>
      <path d="M303 115V44L346 112Z" fill="#142C4D" stroke="#E9B66B" strokeWidth="1.3"/>
      <path d="M265 119Q319 141 373 116L362 130Q318 148 279 133Z" fill="#071B33" stroke="#DAAD67" strokeWidth="2"/>
      <path d="M300 49V133M303 43L317 47L303 55Z" stroke="#F2CE85" strokeWidth="2" fill="#DB7C38"/>
    </g>
    {variant==='missions'
      ? <g opacity=".58" stroke="#FFE3AB" fill="none" strokeWidth="2">
          <path d="M13 15Q45 9 73 25T134 24" strokeDasharray="4 8" strokeLinecap="round"/>
          <path d="M107 13L123 28M123 13L107 28"/>
          <circle cx="92" cy="20" r="10" strokeDasharray="3 5"/>
        </g>
      : <g opacity=".43" stroke="#FFE2A1" fill="none">
          <circle cx="69" cy="67" r="36" strokeWidth="2"/>
          <circle cx="69" cy="67" r="29"/>
          <path d="M69 24V110M26 67H112M44 42L94 92M94 42L44 92"/>
          <path d="M69 39L79 67L69 96L59 67Z" fill="#FFD883" strokeWidth="2"/>
        </g>}
    {/* Extra original coastal details: illustrated landscape, not the approved screenshot as a background. */}
    <g className="w8-coastal-trees" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
      {/* Hand-drawn tropical islands and palms: actual responsive SVG scenery,
          kept underneath functional cards rather than using a flat screenshot. */}
      <path d="M0 110Q22 82 50 91Q84 84 116 110L121 135H0Z" fill="#2A8066"/>
      <path d="M0 122Q36 100 73 115Q95 113 120 129V149H0Z" fill="#11516A"/>
      <path d="M316 128Q355 93 385 91Q405 94 420 102V149H320Z" fill="#26785B"/>
      <path d="M316 136Q351 115 385 120Q405 114 420 125V153H316Z" fill="#104E61"/>
      <path d="M0 132Q53 125 91 131T181 128T289 134T420 128" fill="none" stroke="#A4DECE" strokeWidth="3" opacity=".52"/>
      <g className="w8-palm-left">
        <path d="M7 146Q27 105 30 40L40 44Q39 107 23 153Z" fill="#7B5030" stroke="#C99B52" strokeWidth="3"/>
        <path d="M20 126L33 119M25 107L37 101M29 86L40 81M30 66L41 61" stroke="#E1AC66" strokeWidth="2.8" opacity=".85"/>
        <g fill="#258259" stroke="#103E43" strokeWidth="1.5">
          <path d="M35 39Q57 10 99 19Q63 20 40 48Q67 24 117 40Q71 36 40 52Z"/>
          <path d="M35 39Q8 4 -22 21Q7 18 33 48Q8 24 -21 46Q9 40 37 53Z"/>
          <path d="M35 40Q60 48 78 86Q58 65 34 51Q58 77 55 100Q43 74 29 53Z"/>
          <path d="M34 38Q37 4 54 -16Q46 12 40 42Q24 19 17 -12Q16 21 31 50Z"/>
        </g>
        <g fill="#69B578" opacity=".86">
          <path d="M35 36Q68 17 93 22Q61 24 40 41Z"/>
          <path d="M30 37Q4 20 -14 26Q13 27 35 45Z"/>
          <path d="M41 49Q63 65 65 80Q50 64 36 53Z"/>
        </g>
        <circle cx="30" cy="47" r="6" fill="#8D572F" stroke="#F1C27E" strokeWidth="2"/>
        <circle cx="39" cy="50" r="5" fill="#9B6139" stroke="#F1C27E" strokeWidth="1.5"/>
      </g>
      <g className="w8-palm-right">
        <path d="M416 151Q385 106 381 37L370 42Q373 103 402 153Z" fill="#87532E" stroke="#D2A066" strokeWidth="3"/>
        <path d="M401 130L388 120M393 110L380 101M387 85L375 79M384 64L372 59" stroke="#E6B477" strokeWidth="2.7"/>
        <g fill="#247D59" stroke="#0B4549" strokeWidth="1.4">
          <path d="M377 39Q344 4 305 20Q349 17 373 50Q337 27 293 43Q344 38 375 54Z"/>
          <path d="M378 38Q410 3 445 23Q413 19 379 49Q406 30 450 49Q412 43 376 53Z"/>
          <path d="M378 40Q353 53 336 89Q360 67 377 53Q355 81 356 101Q373 73 386 54Z"/>
          <path d="M378 36Q378 4 360 -18Q365 12 372 42Q389 13 399 -13Q396 19 381 51Z"/>
        </g>
        <g fill="#77BA82" opacity=".8">
          <path d="M374 38Q343 16 310 24Q348 24 374 44Z"/>
          <path d="M382 40Q413 22 440 25Q410 26 381 46Z"/>
          <path d="M371 52Q352 71 347 83Q363 68 380 52Z"/>
        </g>
        <circle cx="377" cy="48" r="6" fill="#8B522B" stroke="#E5B772" strokeWidth="1.6"/>
      </g>
      <g className="w8-island-port" opacity=".87">
        <path d="M392 115V83L411 88V116Z" fill="#B7804E" stroke="#503925" strokeWidth="2"/>
        <path d="M386 84L403 68L418 86Z" fill="#D69A55" stroke="#F3D492" strokeWidth="2"/>
        <path d="M399 72V61L404 57L408 63V72Z" fill="#E2C78B"/>
        <path d="M397 95H406V105H397Z" fill="#173F54" stroke="#E6C17D" strokeWidth="2"/>
        <path d="M70 119V99L91 99V120" fill="#C39560" stroke="#765337" strokeWidth="2"/>
        <path d="M65 100L79 88L98 100Z" fill="#E3B77B" stroke="#72462C" strokeWidth="2"/>
      </g>
    </g>
    <g fill="none" stroke="#D7FAF5" strokeWidth="2" opacity=".68" strokeLinecap="round" aria-hidden="true">
      <path d="M134 56q7-6 14 0q7-6 14 0M182 35q7-5 13 0q7-5 13 0"/>
      <path d="M38 151q13-3 25 0M95 164q12-4 30 0M324 157q14-3 25 0"/>
    </g>
    <g fill="#FFD98A" opacity=".42" aria-hidden="true">
      <path d="M118 117l2-9 2 9 8 2-8 2-2 8-2-8-8-2Z"/>
      <path d="M387 145l2-6 2 6 5 2-5 2-2 6-2-6-5-2Z"/>
    </g>
    <path d="M0 0H420V176H0Z" fill="none" stroke="#EABF77" strokeWidth="4" opacity=".3"/>
  </svg>;
}

/** WORK 8: live React screens. All player values come from the persisted local profile. */
export type RankingTab = 'ranking'|'leagues';
type Navigate = (screen:'ranking'|'profile'|'missions'|'battle')=>void;

/** Tabs follow the approved mobile mosaic; all actions still navigate real screens. */
export function RankingTabs({active,onNavigate,onLeagues}:{
  active:'ranking'|'profile'|'leagues';onNavigate:Navigate;onLeagues:()=>void;
}) {
  return <nav className="w8-approved-tabs" aria-label="Secções de ranking e perfil">
    <button type="button" aria-label="RANKING" aria-pressed={active==='ranking'} onClick={()=>onNavigate('ranking')}>RANKING GLOBAL</button>
    <button type="button" aria-label="LIGAS" aria-pressed={active==='leagues'} onClick={onLeagues}>A MINHA LIGA</button>
    <button type="button" aria-label="O MEU PERFIL" aria-pressed={active==='profile'} onClick={()=>onNavigate('profile')}>PERFIL</button>
  </nav>;
}

function W8Title({children,kind}:{children:string;kind:'flag'|'trophy'|'scroll'}) {
  return <div className="w8-approved-title">
    <div className="w8-approved-title-flourish" aria-hidden="true"><W8Art kind={kind}/></div>
    <h2>{children}</h2>
    <span className="w8-approved-title-curl" aria-hidden="true">❦</span>
  </div>;
}

/* Distinct original pirate portrait drawn as vector art; not cropped from the approved UI. */
function W8CaptainPortrait(){
  return <svg className="w8-captain-portrait" viewBox="0 0 100 108" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    {/* A lit illustrated portrait, not a fabricated account or photo. */}
    <defs>
      <radialGradient id="w8-portrait-halo" cx=".36" cy=".24" r=".87">
        <stop stopColor="#F7D99B"/><stop offset=".4" stopColor="#A96B35"/><stop offset="1" stopColor="#09253C"/>
      </radialGradient>
      <linearGradient id="w8-portrait-coat" x1=".05" y1="0" x2=".95" y2="1">
        <stop stopColor="#3D7191"/><stop offset=".48" stopColor="#102E4D"/><stop offset="1" stopColor="#061D38"/>
      </linearGradient>
    </defs>
    <circle cx="50" cy="54" r="49" fill="url(#w8-portrait-halo)" opacity=".76"/>
    <path d="M5 76Q20 57 14 25M84 19Q90 49 97 77" stroke="#FFE4A6" strokeWidth="2" opacity=".35"/>
    <path d="M7 92Q18 72 30 78L50 94L72 78Q87 79 94 98V108H7Z" fill="url(#w8-portrait-coat)" stroke="#E9AF5D" strokeWidth="1.8"/>

    <path d="M4 106Q7 83 26 78L41 70H59L74 78Q93 83 96 106Z" fill="#0A345A" stroke="#F0BF6C" strokeWidth="3"/>
    <path d="M18 96L33 77L50 94L67 77L82 96V108H18Z" fill="#173E62"/>
    <path d="M36 76L50 87L64 76L59 67H41Z" fill="#D88C5C" stroke="#773C2C" strokeWidth="2"/>
    <path d="M28 46Q19 43 23 62Q25 69 32 68L37 80L50 90L63 80L68 68Q76 70 77 59Q80 44 71 46L68 35H33Z" fill="#38251E" stroke="#160F15" strokeWidth="3"/>
    <path d="M33 38Q24 46 31 64Q38 77 50 74Q62 77 69 63Q76 44 67 37Z" fill="#E6A268" stroke="#723C2C" strokeWidth="2"/>
    <path d="M28 60Q29 76 40 79Q45 90 50 91Q55 90 60 79Q72 75 73 60L64 72L59 68L50 73L41 68L36 72Z" fill="#321D1C"/>
    <path d="M33 57Q40 51 48 58L50 61L52 58Q60 51 67 57Q61 68 50 65Q39 68 33 57Z" fill="#4C2B24"/>
    <path d="M35 48L46 46M54 46L65 48" stroke="#44291F" strokeWidth="3" strokeLinecap="round"/>
    <circle cx="41" cy="51" r="2.4" fill="#132332"/><circle cx="59" cy="51" r="2.4" fill="#132332"/>
    <path d="M50 49L47 58H53" stroke="#A96341" strokeWidth="2" strokeLinecap="round"/>
    <path d="M23 38Q11 31 9 27Q25 6 37 18Q50 5 63 18Q75 5 91 27Q89 35 77 38L68 34H32Z" fill="#17283B" stroke="#F5C771" strokeWidth="4" strokeLinejoin="round"/>
    <path d="M15 28Q25 19 34 24Q50 10 66 24Q75 19 85 28Q72 37 50 35Q28 37 15 28Z" fill="#26394B" stroke="#B9853D" strokeWidth="2"/>
    <path d="M34 26Q50 31 66 26" stroke="#F6D98D" strokeWidth="3" strokeLinecap="round"/>
    <path d="M46 22L50 17L54 22L50 27Z" fill="#F5D98B" stroke="#89592B" strokeWidth="1.5"/>
    <path d="M21 59Q15 62 22 70" stroke="#F5C66C" strokeWidth="3" strokeLinecap="round"/>
    <circle cx="22" cy="72" r="3" stroke="#E5BA64" strokeWidth="2"/>
    <path d="M23 101L33 84M77 101L67 84" stroke="#D8A658" strokeWidth="3"/>
    <path d="M14 105L33 79L44 94M86 105L67 79L56 94" stroke="#F9D392" strokeWidth="2.4" strokeLinecap="round" opacity=".96"/>
    <path d="M23 94L33 86L40 97M77 94L67 86L60 97" stroke="#C98539" strokeWidth="1.4"/>
    <path d="M48 90L50 94L52 90L50 98Z" fill="#FCE4A5" stroke="#88521F" strokeWidth="1"/>
    <circle cx="50" cy="103" r="2.5" fill="#F8D77C"/>
    <path d="M31 34Q49 40 69 33" stroke="#FFEBAB" strokeWidth="1.4" opacity=".75"/>
    <path d="M25 31Q28 23 35 22M76 31Q73 23 66 22" stroke="#FFE5A6" strokeWidth="1.5" strokeLinecap="round" opacity=".85"/>
    <path d="M29 43Q34 40 38 40M62 40Q66 40 71 43" stroke="#FFE4B9" strokeWidth="1.2" opacity=".48"/>
    <path d="M27 62Q28 72 38 79M73 62Q72 72 62 79" stroke="#BF7545" strokeWidth="1.1" opacity=".8"/>

  </svg>;
}

export function RankingPanel({profile,tab,onTab,onNavigate}:{
  profile:LocalProfile;tab:RankingTab;onTab:(tab:RankingTab)=>void;onNavigate:Navigate;
}) {
  const level=levelFor(profile.xp);
  const xpFloor=80*(level-1)*(level-1),xpCeiling=80*level*level;
  const xpPct=level===20?100:Math.min(100,Math.max(0,100*(profile.xp-xpFloor)/(xpCeiling-xpFloor)));
  const localName=profile.playerName.trim()||'O TEU CAPITÃO';
  const total=battlesPlayed(profile);
  return <div className="w8-screen w8-approved w8-approved-ranking w8-ranking-scene">
    <div className="w8-approved-scene" aria-hidden="true"><W8SeaBackdrop variant="ranking"/></div>
    <W8Title kind="trophy">RANKING</W8Title>
    <RankingTabs active={tab} onNavigate={screen=>{if(screen==='ranking')onTab('ranking');else onNavigate(screen);}}
      onLeagues={()=>onTab('leagues')}/>
    {tab==='ranking'?<>
      <section className="w8-approved-captain" aria-label="Progresso real do capitão local">
        <div className="w8-approved-avatar" aria-hidden="true"><W8CaptainPortrait/></div>
        <div className="w8-approved-identity">
          <strong>{localName}</strong>
          <span>Nível {level} · {total} batalhas</span>
          <div className="w8-approved-meter" role="progressbar" aria-label="XP até ao próximo nível" aria-valuemin={xpFloor} aria-valuemax={xpCeiling} aria-valuenow={Math.min(profile.xp,xpCeiling)}>
            <span style={{width:xpPct+'%'}}/>
          </div>
          <small>{profile.xp.toLocaleString('pt-PT')} / {xpCeiling.toLocaleString('pt-PT')} XP</small>
        </div>
        <div className="w8-approved-league-status">
          <W8Art kind="medal"/>
          <small>LIGA OFFLINE</small>
          <strong>{profile.wins} VITÓRIAS</strong>
        </div>
      </section>
      <section className="w8-approved-leaderboard" aria-label="There is no global leaderboard yet">
        <h3>TOP JOGADORES</h3>
        <div className="w8-approved-local-row">
          <span className="w8-approved-place w8-local-indicator" title="Sem posição no ranking global" aria-hidden="true"><W8Art kind="flag"/></span>
          <div className="w8-approved-mini-avatar" aria-hidden="true"><W8CaptainPortrait/></div>
          <div className="w8-approved-player-detail"><strong>{localName}</strong><small>O TEU PERFIL LOCAL</small></div>
          <span className="w8-approved-player-score"><PirateIcon name="ranking" size={17}/>{profile.xp} XP</span>
        </div>
        {[2,3,4,5].map(slot=><div className="w8-approved-empty-rank" key={slot} aria-label={'Lugar '+slot+' indisponível'}>
          <span>{slot}</span>
          <span className="w8-approved-empty-portrait" aria-hidden="true">
            <svg viewBox="0 0 40 44" focusable="false" aria-hidden="true">
              {/* An unoccupied pirate-portrait silhouette, never a fictional player. */}
              <path d="M3 42q2-13 12-14l5 4 5-4q10 1 12 14Z" fill="#274A64" stroke="#86ADBD" strokeWidth="1.8"/>
              <path d="M13 27q1 12 7 13 6-1 7-13" fill="#365970"/>
              <path d="M10 17q0-11 10-11t10 11l-4 11-6 4-6-4Z" fill="#6C8B9B" stroke="#A1B8C0" strokeWidth="1.5"/>
              <path d="M11 23l5 9 4 3 4-3 5-9-6 3h-6Z" fill="#32536A"/>
              <path d="M5 16Q8 3 17 8Q20 0 24 8Q33 3 36 16Q28 20 20 17Q12 20 5 16Z" fill="#203F58" stroke="#D5BF81" strokeWidth="1.7"/>
              <path d="M5 16Q20 22 35 16M14 11h12" fill="none" stroke="#D2B276" strokeWidth="1.7"/>
              <path d="M15 22h2M23 22h2" stroke="#25465B" strokeWidth="1.6" strokeLinecap="round"/>
              <path d="M9 12Q20 0 31 12M9 16Q20 21 31 16" fill="none" stroke="#E8C994" strokeWidth="1.1" opacity=".75"/>
              <path d="M12 37l7-5 2 5 6-5" fill="none" stroke="#B5C8CA" strokeWidth="1.25" opacity=".75"/>
              <path d="M6 40Q20 33 34 40" fill="none" stroke="#F3D7A2" strokeWidth="1" opacity=".62"/>

            </svg>
          </span>
          <strong>{'POSIÇÃO INDISPONÍVEL'}</strong>
          <small className="w8-approved-empty-score" aria-hidden="true">—</small>
        </div>)}
        <p>Ranking online indisponível. Apenas o teu progresso local é apresentado, sem adversários ou prémios fictícios.</p>
      </section>
      <div className="w8-approved-personal-stat"><strong>{profile.wins} VITÓRIAS</strong><span>{profile.losses} DERROTAS</span><span>{profile.shots?Math.round(100*profile.hits/profile.shots)+'%':'—'} PRECISÃO</span></div>
      <button type="button" className="app-cta w8-approved-profile-button" onClick={()=>onNavigate('profile')}>VER O MEU PERFIL</button>
    </>:<>
      <section className="w8-approved-leaderboard w8-approved-leagues-offline">
        <div className="w8-approved-league-large" aria-hidden="true"><W8Art kind="medal"/></div>
        <h3>A MINHA LIGA</h3>
        <strong>AINDA SEM LIGA ONLINE</strong>
        <p>O jogo ainda não tem temporadas, ranking global ou servidor competitivo. O teu progresso neste dispositivo continua disponível no perfil.</p>
        <button type="button" className="app-cta w8-approved-profile-button" onClick={()=>onNavigate('profile')}>VER O MEU PERFIL</button>
      </section>
    </>}
  </div>;
}

export function MissionsPanel({profile,onDaily,onMission,onNavigate}:{
  profile:LocalProfile;onDaily:()=>void;onMission:(id:MissionId)=>void;onNavigate:Navigate;
}) {
  const [tab,setTab]=React.useState<'daily'|'weekly'|'events'>('daily');
  const [message,setMessage]=React.useState('');
  const now=Date.now(),canClaim=canClaimDaily(profile,now),next=nextDailyStreak(profile,now);
  const visibleStreak=canClaim&&next===1?0:profile.dailyStreak;
  const missionOrder:MissionId[]=['three-battles','five-hits','first-win'];
  const titles:Record<MissionId,string>={
    'three-battles':'Conclui 3 batalhas',
    'five-hits':'Acerta 5 tiros de canhão',
    'first-win':'Vence a primeira batalha'
  };
  return <div className="w8-screen w8-approved w8-approved-missions w8-missions-scene">
    <div className="w8-approved-scene" aria-hidden="true"><W8SeaBackdrop variant="missions"/></div>
    <W8Title kind="scroll">MISSÕES</W8Title>
    <nav className="w8-approved-tabs" aria-label="Categorias de missões">
      <button type="button" onClick={()=>{setTab('daily');setMessage('');}} aria-pressed={tab==='daily'}>DIÁRIAS</button>
      <button type="button" onClick={()=>{setTab('weekly');setMessage('');}} aria-pressed={tab==='weekly'}>SEMANAIS</button>
      <button type="button" onClick={()=>{setTab('events');setMessage('');}} aria-pressed={tab==='events'}>EVENTOS</button>
    </nav>
    {tab==='daily'?<>
      <section className="w8-approved-quest-list" aria-label="Missões com objetivos reais do jogador">
        {missionOrder.map((id,index)=>{
          const mission=MISSIONS.find(m=>m.id===id)!;
          const progress=missionProgress(profile,id);
          const claimed=profile.claimedMissions.includes(id);
          const canCollect=!claimed&&progress>=mission.target;
          const kind:W8ArtKind=index===0?'swords':index===1?'ship':'target';
          return <article className="w8-approved-quest" key={id} data-state={claimed?'claimed':canCollect?'ready':'active'}>
            <div className="w8-approved-quest-art" aria-hidden="true"><W8Art kind={kind}/></div>
            <div className="w8-approved-quest-core">
              <strong>{titles[id]}</strong>
              <div className="w8-approved-meter" role="progressbar" aria-label={titles[id]+' — progresso'} aria-valuemin={0} aria-valuemax={mission.target} aria-valuenow={progress}>
                <span style={{width:100*progress/mission.target+'%'}}/>
                <b>{progress}/{mission.target}</b>
              </div>
            </div>
            <div className="w8-approved-quest-rewards">
              <span className="w8-approved-coin" title="Moedas locais">●<strong>{mission.reward}</strong></span>
              <span className="w8-approved-gem" title="Gemas indisponíveis">◆<strong>—</strong></span>
            </div>
            <button type="button" disabled={claimed} onClick={()=>{
              if(canCollect){onMission(id);setMessage('Recompensa de '+titles[id]+' recolhida neste dispositivo.');}
              else onNavigate('battle');
            }}>{claimed?'FEITO':canCollect?'RECOLHER':'JOGAR'}</button>
          </article>;
        })}
      </section>
      <section className="w8-approved-daily" aria-label="7-day supply route" title={canClaim?'Next claim earns '+(15+next*5)+' coins':'Recompensa de hoje já recolhida'}>
        <h3>Recompensa Diária</h3>
        <ol className="w8-approved-days" aria-label="Seven consecutive daily rewards">
          {Array.from({length:7},(_,i)=>i+1).map(n=><li key={n} aria-label={'DAY '+n} className={'app-week-day'+(n<=visibleStreak?' is-claimed':canClaim&&n===next?' is-next':'')}>
            <span className="w8-approved-chest" aria-hidden="true"><W8Art kind="chest"/>{n<=visibleStreak&&<b>✓</b>}</span>
            <small>Dia {n}</small>
          </li>)}
        </ol>
        <div className="w8-approved-claim-row">
          <small>{canClaim?'Baú do dia '+next+': '+(15+next*5)+' moedas locais':'Baú de hoje recolhido · próxima recolha às 00:00 UTC'}</small>
          <button type="button" disabled={!canClaim} onClick={()=>{onDaily();setMessage('Recompensa diária recolhida no teu perfil local.');}}>{canClaim?'RECOLHER':'RECOLHIDO'}</button>
        </div>
      </section>
      <p className="w8-approved-disclaimer">Missões permanentes e moedas guardadas apenas neste dispositivo. Gemas e eventos online ainda indisponíveis.</p>
    </>:<section className="w8-approved-leaderboard w8-approved-other-missions">
      <div className="w8-approved-league-large" aria-hidden="true"><W8Art kind="flag"/></div>
      <strong>{tab==='weekly'?'MISSÕES SEMANAIS EM BREVE':'SEM EVENTOS ATIVOS'}</strong>
      <p>{tab==='weekly'?'Ainda não existe calendário semanal ativo nem recompensas semanais.':'Não existem eventos online nem recompensas fictícias nesta versão.'}</p>
      <button type="button" onClick={()=>setTab('daily')}>VER MISSÕES DISPONÍVEIS</button>
    </section>}
    {message&&<div className="w8-approved-message" role="status" aria-live="polite">{message}</div>}
  </div>;
}
