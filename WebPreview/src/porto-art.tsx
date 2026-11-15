import React from 'react';
import { PirateIcon, type PirateIconName } from './app-icons';

/**
 * Original full-colour vector illustrations for the PORTO HUD.
 * These are real SVG icons inside live buttons, not a screenshot of the interface.
 * Keep the illustrations isolated from the shared app icon component (Work 4/7/8).
 */
export function PortoArt({name,size=38}:{name:PirateIconName;size?:number}) {
  const art:Partial<Record<PirateIconName,React.ReactNode>> = {
    arena:<>
      <path d="M17 45 49 12l6 1-1 7-32 32-9 3z" fill="url(#steel)" stroke="#704524" strokeWidth="2"/>
      <path d="m47 8 9 8-2 5-13-9z" fill="url(#gold)" stroke="#573110" strokeWidth="2"/>
      <path d="M47 44 16 11l-6 1 1 7 31 32 10 3z" fill="url(#steel)" stroke="#513a32" strokeWidth="2"/>
      <path d="m17 8-9 8 3 6 13-11zM10 49l9-9 5 5-9 9zM41 45l5-5 9 9-6 6z" fill="url(#gold)" stroke="#603714" strokeWidth="2"/>
      <circle cx="32" cy="32" r="5" fill="#ffe59a" stroke="#8d511c" strokeWidth="2"/>
    </>,
    chests:<>
      <path d="M7 27q0-16 25-16t25 16v27H7z" fill="#9e4d25" stroke="#512710" strokeWidth="3"/>
      <path d="M9 28q1-15 23-15t23 15z" fill="url(#gold)" stroke="#ffeaac" strokeWidth="2"/>
      <path d="M10 29h44v25H10z" fill="url(#wood)" stroke="#41200f" strokeWidth="3"/>
      <path d="M13 27h7v27h-7zM44 27h7v27h-7zM9 37h46v6H9z" fill="url(#gold)" stroke="#aa651b" strokeWidth="1"/>
      <rect x="27" y="29" width="10" height="14" rx="2" fill="#ffd969" stroke="#8a5017" strokeWidth="2"/>
      <path d="M31 35h2v5h-2z" fill="#563a17"/>
      <circle cx="15" cy="49" r="1.5" fill="#fff4ae"/><circle cx="49" cy="49" r="1.5" fill="#fff4ae"/>
    </>,
    events:<>
      <path d="M13 8h40v43q-3 5-7 0H15q-4 3-6-3V13q0-5 4-5Z" fill="url(#paper)" stroke="#9f6b3b" strokeWidth="2.5"/>
      <path d="M17 18h27M17 23h19M17 28h22" stroke="#be8652" strokeWidth="3" strokeLinecap="round"/>
      <path d="m33 33 6 4-1 8-7 4-7-4-1-8z" fill="#d53a24" stroke="#742118" strokeWidth="2"/>
      <path d="m27 40 4 3 5-6" stroke="#ffe8a1" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
      <path d="M12 10q-7 4 0 9h7v-9zM47 47q7 0 9 5-2 5-8 5H15q-6-1-6-7" fill="#d3a363" stroke="#956536" strokeWidth="2"/>
    </>,
    rewards:<>
      <path d="M10 28h44v28H10z" fill="url(#royal)" stroke="#693b2f" strokeWidth="2.5"/>
      <path d="M7 22h50v11H7z" fill="url(#gold)" stroke="#94601e" strokeWidth="2"/>
      <path d="M28 22h9v34h-9z" fill="#ff7d2d" stroke="#a93c10" strokeWidth="1.5"/>
      <path d="M27 22C7 22 8 8 19 9c6 0 11 8 13 13M37 22c3-13 15-17 18-10 3 8-8 13-18 10" fill="none" stroke="#ffd467" strokeWidth="6" strokeLinecap="round"/>
      <path d="M28 22C7 22 8 8 19 9c6 0 11 8 13 13M37 22c3-13 15-17 18-10 3 8-8 13-18 10" fill="none" stroke="#ff9b32" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="32" cy="24" r="5" fill="#ffdb71" stroke="#a25713" strokeWidth="1.5"/>
      <path d="M15 42h9M40 42h10" stroke="#ffe19b" strokeWidth="2"/>
    </>,
    missions:<>
      <path d="M15 8h34v47H15z" fill="url(#paper)" stroke="#a57945" strokeWidth="3"/>
      <path d="M22 7h20v8H22z" fill="url(#gold)" stroke="#9b5a18" strokeWidth="2"/>
      <path d="M21 23h15M21 32h15M21 41h14" stroke="#b78f57" strokeWidth="2.5" strokeLinecap="round"/>
      <rect x="34" y="29" width="23" height="23" rx="5" fill="#287b35" stroke="#cbe874" strokeWidth="2.5"/>
      <path d="m39 40 5 5 9-11" stroke="#ffffbe" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </>,
    offers:<>
      <path d="m10 11 27-5 20 20-28 31L7 33z" fill="url(#royal)" stroke="#ffcc5a" strokeWidth="3" strokeLinejoin="round"/>
      <path d="m14 15 23-4 15 15-24 25L12 32z" fill="#cb2e37" stroke="#ff9071" strokeWidth="1.5"/>
      <circle cx="36" cy="18" r="4" fill="#fff3ab" stroke="#873a1d" strokeWidth="1"/>
      <circle cx="23" cy="31" r="5" fill="#ffde83"/><circle cx="39" cy="38" r="5" fill="#ffde83"/>
      <path d="M19 44 43 24" stroke="#ffedb2" strokeWidth="5" strokeLinecap="round"/>
    </>,
    battle:<>
      <path d="M13 48 48 11l6 2-1 7-35 35-10 2z" fill="url(#steel)" stroke="#6d3d16" strokeWidth="2.5"/>
      <path d="M50 7 57 14l-3 8-12-12zM9 42l12 12-6 5L5 48z" fill="url(#gold)" stroke="#98571a" strokeWidth="2"/>
      <path d="M48 48 13 11l-6 2 1 7 35 35 10 2z" fill="url(#steel)" stroke="#6d3d16" strokeWidth="2.5"/>
      <path d="m14 7-7 7 3 8 12-12zM55 42 43 54l6 5 10-11z" fill="url(#gold)" stroke="#98571a" strokeWidth="2"/>
      <circle cx="32" cy="32" r="6" fill="#ffdb75" stroke="#8c4318" strokeWidth="2"/>
    </>,
    port:<>
      <path d="M32 8v39" stroke="url(#gold)" strokeWidth="7" strokeLinecap="round"/>
      <circle cx="32" cy="11" r="5" fill="#f1bc48" stroke="#fff3b1" strokeWidth="2"/>
      <path d="M17 28h30M11 38c0 21 42 21 42 0" stroke="url(#gold)" strokeWidth="7" strokeLinecap="round" fill="none"/>
      <path d="m9 37 1 11 10-4M55 37l-1 11-10-4" fill="#f8d367" stroke="#9b5d1d" strokeWidth="2"/>
    </>,
    fleet:<>
      <path d="M30 9v38M37 15v34" stroke="#8a532b" strokeWidth="3"/>
      <path d="M27 9 9 36h19z" fill="#fff2ce" stroke="#956b4d" strokeWidth="2"/>
      <path d="m34 14 16 24H34z" fill="#e7d8af" stroke="#9b7a52" strokeWidth="2"/>
      <path d="M9 42h47l-10 12H18z" fill="url(#wood)" stroke="#633319" strokeWidth="3"/>
      <path d="M14 48h37" stroke="#ffc45e" strokeWidth="3"/>
      <path d="M8 59c5-4 9-4 14 0 5-4 9-4 14 0 5-4 9-4 14 0" stroke="#9beaff" strokeWidth="3" fill="none"/>
    </>,
    cards:<>
      <rect x="9" y="7" width="34" height="45" rx="4" transform="rotate(-10 26 29)" fill="#f7e8cb" stroke="#d29c4f" strokeWidth="3"/>
      <rect x="22" y="11" width="33" height="44" rx="4" transform="rotate(8 38 33)" fill="url(#royal)" stroke="#ffd272" strokeWidth="3"/>
      <path d="m37 18 5 10 11 1-8 8 2 11-10-5-10 5 2-11-8-8 11-1z" fill="#fbd76a" stroke="#a05d24" strokeWidth="1.5"/>
      <path d="M14 19h8M14 24h6" stroke="#cc5750" strokeWidth="2"/>
    </>,
    shop:<>
      <path d="M11 27h43v27H11z" fill="#84583e" stroke="#47251f" strokeWidth="3"/>
      <path d="M9 23h47l-4 13H13z" fill="#f5c56d" stroke="#663416" strokeWidth="2"/>
      <path d="M11 23h8l-1 12h-7zM26 23h8l-1 12h-8zM42 23h8l2 12h-8z" fill="#c93630" stroke="#902825" strokeWidth="1"/>
      <path d="M15 13h35l6 10H9z" fill="url(#gold)" stroke="#8d5618" strokeWidth="2"/>
      <rect x="23" y="40" width="19" height="14" rx="2" fill="#245d8b" stroke="#ffd46c" strokeWidth="2"/>
      <path d="M32 42v10M27 47h10" stroke="#ffcc73" strokeWidth="2.5"/>
    </>,
    ranking:<>
      <path d="M20 10h24v18c0 11-8 17-12 17S20 39 20 28z" fill="url(#gold)" stroke="#8d5b1c" strokeWidth="3"/>
      <path d="M20 15H9c-1 15 4 18 14 18M44 15h11c1 15-4 18-14 18" fill="none" stroke="#e8b94e" strokeWidth="5" strokeLinejoin="round"/>
      <path d="M32 17v21M26 22h12" stroke="#fff1a7" strokeWidth="4" strokeLinecap="round"/>
      <path d="M27 43v8M37 43v8" stroke="#ae6d2a" strokeWidth="5"/>
      <path d="M19 54h26v5H19z" fill="url(#wood)" stroke="#ffdf80" strokeWidth="2"/>
    </>
  };
  const illustration=art[name];
  if(!illustration)return <PirateIcon name={name} size={size}/>;
  return <svg className="porto-art" data-porto-art={name} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff5b9"/><stop offset=".42" stopColor="#f9c350"/><stop offset="1" stopColor="#a96519"/></linearGradient>
      <linearGradient id="steel" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fffdf3"/><stop offset=".45" stopColor="#c8e3e6"/><stop offset="1" stopColor="#60899b"/></linearGradient>
      <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#bd7839"/><stop offset=".5" stopColor="#824222"/><stop offset="1" stopColor="#4d2b20"/></linearGradient>
      <linearGradient id="royal" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#3075a4"/><stop offset=".52" stopColor="#174872"/><stop offset="1" stopColor="#092641"/></linearGradient>
      <linearGradient id="paper" x1="0" y1="0" x2=".8" y2="1"><stop stopColor="#fff3c7"/><stop offset=".5" stopColor="#edcf92"/><stop offset="1" stopColor="#c28d51"/></linearGradient>
    </defs>
    {illustration}
  </svg>;
}
