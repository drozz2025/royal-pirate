import React from 'react';
import type { CrewId } from './progression';

/**
 * Three original vector crew portraits, rendered from the actual selected crew ID.
 * Artwork is decorative: ownership, currency and combat strength remain governed
 * only by the saved progression rules, not by any displayed picture.
 */
export function CrewPortrait({id}:{id:CrewId}) {
  const captain=id==='captain',gunner=id==='gunner';
  return <svg className={'app-crew-portrait app-crew-portrait-'+id}
      data-crew-portrait={id} viewBox="0 0 180 180" focusable="false" aria-hidden="true">
    <defs>
      <radialGradient id="rp-crew-glow" cx="50%" cy="33%" r="75%">
        <stop stopColor={captain?'#708d97':gunner?'#b4805b':'#70b6b9'}/>
        <stop offset="1" stopColor="#0a2442"/>
      </radialGradient>
      <linearGradient id="rp-crew-metal" x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#fff0b8"/><stop offset=".48" stopColor="#d2a85c"/>
        <stop offset="1" stopColor="#7e5630"/>
      </linearGradient>
    </defs>
    <circle cx="90" cy="90" r="79" fill="url(#rp-crew-glow)" stroke="url(#rp-crew-metal)" strokeWidth="3"/>
    <circle cx="90" cy="90" r="70" fill="none" stroke="#f5e0a5" strokeOpacity=".28" strokeDasharray="2 5"/>
    <path d="M33 134 Q90 118 147 134" fill="none" stroke="#b2d4dc" strokeOpacity=".45" strokeWidth="2"/>
    {captain ? <g data-crew-art="captain-mara">
      {/* Captain Mara: high collar, decorated coat, tricorne and stern gaze. */}
      <path d="M35 154 Q41 120 65 108 L90 115 116 108 Q143 118 146 154Z" fill="#a13b37" stroke="#f4d48a" strokeWidth="2.8"/>
      <path d="M58 118 L76 148 91 127 104 148 122 118" fill="#1b354d" stroke="#f0c985" strokeWidth="2"/>
      <path d="M81 116 L90 126 99 116 97 141 90 147 83 141Z" fill="#e7cda2"/>
      <path d="M66 75 Q59 51 72 48 L105 48 Q124 57 113 86 L112 98 101 109 80 110 67 96Z" fill="#4a302d"/>
      <path d="M68 74 Q69 53 90 53 Q111 53 112 74 L111 91 Q109 110 90 112 Q71 110 69 91Z" fill="#d49d71" stroke="#f1cd95" strokeWidth="2"/>
      <path d="M75 85 H82 M97 85 H104" stroke="#3c302c" strokeWidth="3" strokeLinecap="round"/>
      <path d="M84 99 Q90 103 96 99" fill="none" stroke="#754a3f" strokeWidth="2" strokeLinecap="round"/>
      <path d="M48 65 Q90 11 133 65 L118 71 90 58 62 71Z" fill="#192c45" stroke="url(#rp-crew-metal)" strokeWidth="4" strokeLinejoin="round"/>
      <path d="M59 51 Q90 38 121 51" fill="none" stroke="#f6dc99" strokeWidth="4" strokeLinecap="round"/>
      <path d="M84 39 L90 27 96 39 90 45Z" fill="#f7d58d"/>
      <path d="M47 150 L72 137 M133 150 L109 137" stroke="#e6b96a" strokeWidth="4"/>
    </g> : gunner ? <g data-crew-art="iron-jack">
      {/* Iron Jack: bandana, eye patch, leather gunner vest and brass shot. */}
      <path d="M34 156 Q41 120 70 109 L91 118 111 109 Q140 122 147 156Z" fill="#724735" stroke="#d3ac71" strokeWidth="2.5"/>
      <path d="M64 113 L90 146 118 113 129 154 51 154Z" fill="#27374a" stroke="#bb8b61" strokeWidth="2.5"/>
      <path d="M91 114 L92 142 M70 126 L114 126" stroke="#d7b477" strokeWidth="3"/>
      <path d="M66 71 Q68 49 90 48 Q113 47 115 76 L112 95 Q106 111 90 114 Q73 110 67 94Z" fill="#bb845d" stroke="#f4c68b" strokeWidth="2"/>
      <path d="M62 74 Q59 42 92 41 Q122 43 118 74 L111 64 67 64Z" fill="#302d36"/>
      <path d="M62 66 Q88 47 119 64 L117 80 Q90 68 64 81Z" fill="#a7423d" stroke="#edaa78" strokeWidth="2"/>
      <path d="M115 76 Q129 92 119 103 L109 92" fill="#a7423d" stroke="#dba67b" strokeWidth="2"/>
      <path d="M70 80 L104 88" stroke="#292831" strokeWidth="3.5"/>
      <path d="M75 83 l10 2 -3 9 -10 -2Z" fill="#212733" stroke="#e5c895" strokeWidth="1.5"/>
      <path d="M100 89 H107" stroke="#272731" strokeWidth="3" strokeLinecap="round"/>
      <path d="M78 101 Q90 108 101 101 M82 108 L93 112 103 108" stroke="#58372d" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <circle cx="123" cy="137" r="11" fill="#ae762d" stroke="#ffdd89" strokeWidth="3"/>
      <circle cx="123" cy="137" r="4" fill="#332f35"/>
    </g> : <g data-crew-art="northwind">
      {/* Northwind: pale blue navigator's coat, wind-blown hair, compass rose. */}
      <path d="M32 156 Q40 122 66 111 L89 118 112 111 Q141 121 148 156Z" fill="#22617b" stroke="#c7dbc6" strokeWidth="3"/>
      <path d="M65 114 L89 147 112 114 128 156 50 156Z" fill="#19334f" stroke="#8bbfc1" strokeWidth="2"/>
      <path d="M83 115 L91 130 100 115 98 148 91 153 85 147Z" fill="#ece6cc"/>
      <path d="M61 82 Q52 52 71 46 Q94 30 114 51 Q128 68 116 91 L109 105 72 103Z" fill="#e1c9a0"/>
      <path d="M67 75 Q67 51 90 50 Q114 49 115 77 L110 94 Q105 109 90 111 Q76 107 70 94Z" fill="#ddb58f" stroke="#f4dec0" strokeWidth="2"/>
      <path d="M65 72 Q79 50 105 51 L118 73 Q111 62 101 61 Q83 80 64 82Z" fill="#b7ccd0"/>
      <path d="M57 78 Q48 54 74 44 L88 41 Q111 37 125 57 L117 72 Q96 45 74 69Z" fill="#243e59" stroke="#d2c89e" strokeWidth="2.5"/>
      <path d="M63 56 Q91 49 116 58" stroke="#c6d5c9" strokeWidth="3" fill="none"/>
      <circle cx="79" cy="86" r="9" stroke="#b8894b" strokeWidth="2.5" fill="none"/>
      <circle cx="102" cy="86" r="9" stroke="#b8894b" strokeWidth="2.5" fill="none"/>
      <path d="M88 86 H93" stroke="#b8894b" strokeWidth="2.5"/>
      <circle cx="79" cy="86" r="2.1" fill="#234058"/><circle cx="102" cy="86" r="2.1" fill="#234058"/>
      <path d="M83 99 Q90 104 97 99" stroke="#775746" strokeWidth="2" fill="none"/>
      <circle cx="125" cy="139" r="12" fill="#dfc691" stroke="#f7e3bb" strokeWidth="2"/>
      <path d="M125 127 L129 139 125 151 121 139Z" fill="#195577"/>
      <path d="M113 139 H137" stroke="#2f6981" strokeWidth="1.5"/>
    </g>}
  </svg>;
}
