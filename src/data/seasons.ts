export interface SeasonTheme {
  /** main brand color for the season */
  primary: string
  /** secondary color */
  secondary: string
  /** bright accent (buttons, glows, links) */
  accent: string
  /** deep background gradient stops */
  bg1: string
  bg2: string
  /** readable text color on the themed background */
  text: string
  /** one-word atmosphere used for texture styling */
  mood: 'jungle' | 'outback' | 'savanna' | 'ocean' | 'island' | 'ruins' | 'river' | 'volcanic' | 'storm'
}

export interface Season {
  number: number
  /** display title, e.g. "Borneo" */
  title: string
  /** exact page title on survivor.fandom.com */
  wikiPage: string
  location: string
  country: string
  lat: number
  lng: number
  year: string
  winner: string
  /** exact winner page title on the wiki */
  winnerPage: string
  tagline: string
  theme: SeasonTheme
}

const t = (
  primary: string,
  secondary: string,
  accent: string,
  bg1: string,
  bg2: string,
  mood: SeasonTheme['mood'],
  text = '#f5efe2',
): SeasonTheme => ({ primary, secondary, accent, bg1, bg2, text, mood })

/** Mamanuca Islands, Fiji — home of every season since 33. Pins fan out in a ring. */
const FIJI = { lat: -17.66, lng: 177.1 }
const fijiRing = (i: number, count = 18, radius = 0.30) => {
  const angle = (i / count) * Math.PI * 2 - Math.PI / 2
  return {
    lat: FIJI.lat + radius * Math.sin(angle),
    lng: FIJI.lng + radius * 1.25 * Math.cos(angle),
  }
}

export const SEASONS: Season[] = [
  {
    number: 1, title: 'Borneo', wikiPage: 'Survivor: Borneo',
    location: 'Pulau Tiga, Sabah', country: 'Malaysia',
    lat: 5.723, lng: 115.652, year: '2000',
    winner: 'Richard Hatch', winnerPage: 'Richard Hatch',
    tagline: 'The one that started it all — 16 strangers marooned on a snake-infested island.',
    theme: t('#2e7d32', '#8d6e63', '#ffd54f', '#0c2611', '#1b3a1f', 'jungle'),
  },
  {
    number: 2, title: 'The Australian Outback', wikiPage: 'Survivor: The Australian Outback',
    location: 'Herbert River, Queensland', country: 'Australia',
    lat: -18.412, lng: 145.923, year: '2001',
    winner: 'Tina Wesson', winnerPage: 'Tina Wesson',
    tagline: 'Floods, fire and starvation in the unforgiving Australian bush.',
    theme: t('#bf5b1d', '#7a3b12', '#ffb74d', '#2b1206', '#4a2410', 'outback'),
  },
  {
    number: 3, title: 'Africa', wikiPage: 'Survivor: Africa',
    location: 'Shaba National Reserve', country: 'Kenya',
    lat: 0.647, lng: 37.723, year: '2001',
    winner: 'Ethan Zohn', winnerPage: 'Ethan Zohn',
    tagline: 'A boma under siege — lions, drought, and the first tribe swap in history.',
    theme: t('#c99b3f', '#8c5a2b', '#ffe082', '#241705', '#3d2b0d', 'savanna'),
  },
  {
    number: 4, title: 'Marquesas', wikiPage: 'Survivor: Marquesas',
    location: 'Nuku Hiva, Marquesas Islands', country: 'French Polynesia',
    lat: -8.867, lng: -140.1, year: '2002',
    winner: 'Vecepia Towery', winnerPage: 'Vecepia Towery',
    tagline: 'Paradise found, power flipped — the coconut-chop that changed strategy forever.',
    theme: t('#00838f', '#26a69a', '#80deea', '#031f24', '#0a3a40', 'ocean'),
  },
  {
    number: 5, title: 'Thailand', wikiPage: 'Survivor: Thailand',
    location: 'Ko Tarutao', country: 'Thailand',
    lat: 6.586, lng: 99.652, year: '2002',
    winner: 'Brian Heidik', winnerPage: 'Brian Heidik',
    tagline: 'Two tribes, one beach, and the fake merge that fooled everyone.',
    theme: t('#7b1fa2', '#c2185b', '#ffab40', '#1d0726', '#33103f', 'island'),
  },
  {
    number: 6, title: 'The Amazon', wikiPage: 'Survivor: The Amazon',
    location: 'Rio Negro', country: 'Brazil',
    lat: -3.062, lng: -60.756, year: '2003',
    winner: 'Jenna Morasca', winnerPage: 'Jenna Morasca',
    tagline: 'Men vs. Women deep in the world’s greatest rainforest.',
    theme: t('#1b5e20', '#33691e', '#aeea00', '#07200b', '#123c17', 'river'),
  },
  {
    number: 7, title: 'Pearl Islands', wikiPage: 'Survivor: Pearl Islands',
    location: 'Pearl Islands', country: 'Panama',
    lat: 8.406, lng: -79.036, year: '2003',
    winner: 'Sandra Diaz-Twine', winnerPage: 'Sandra Diaz-Twine',
    tagline: 'Pirates, plundering, and the Outcasts twist — arguably the greatest season ever.',
    theme: t('#263238', '#b8860b', '#ffd700', '#0a0f12', '#1c262b', 'storm'),
  },
  {
    number: 8, title: 'All-Stars', wikiPage: 'Survivor: All-Stars',
    location: 'Pearl Islands', country: 'Panama',
    lat: 8.27, lng: -78.9, year: '2004',
    winner: 'Amber Brkich', winnerPage: 'Amber Mariano',
    tagline: 'Eighteen legends return — friendships burn and a proposal at Final Tribal.',
    theme: t('#1a237e', '#b8860b', '#ffca28', '#050a2a', '#131c4f', 'ocean'),
  },
  {
    number: 9, title: 'Vanuatu', wikiPage: 'Survivor: Vanuatu',
    location: 'Efate', country: 'Vanuatu',
    lat: -17.74, lng: 168.312, year: '2004',
    winner: 'Chris Daugherty', winnerPage: 'Chris Daugherty',
    tagline: 'Islands of fire — one man survives seven women to steal the million.',
    theme: t('#bf360c', '#5d4037', '#ff7043', '#230a03', '#3f1a0a', 'volcanic'),
  },
  {
    number: 10, title: 'Palau', wikiPage: 'Survivor: Palau',
    location: 'Koror', country: 'Palau',
    lat: 7.342, lng: 134.479, year: '2005',
    winner: 'Tom Westman', winnerPage: 'Tom Westman',
    tagline: 'One tribe wiped off the map — Ulong loses every single immunity challenge.',
    theme: t('#0277bd', '#00acc1', '#4fc3f7', '#02131f', '#063450', 'ocean'),
  },
  {
    number: 11, title: 'Guatemala', wikiPage: 'Survivor: Guatemala',
    location: 'Yaxhá, Petén', country: 'Guatemala',
    lat: 17.062, lng: -89.402, year: '2005',
    winner: 'Danni Boatwright', winnerPage: 'Danni Boatwright',
    tagline: 'Mayan ruins, brutal heat, and the first hidden immunity idol.',
    theme: t('#00695c', '#827717', '#ffd54f', '#03201c', '#0b3a34', 'ruins'),
  },
  {
    number: 12, title: 'Panama', wikiPage: 'Survivor: Panama',
    location: 'Exile Island, Pearl Islands', country: 'Panama',
    lat: 8.2, lng: -79.18, year: '2006',
    winner: 'Aras Baskauskas', winnerPage: 'Aras Baskauskas',
    tagline: 'Exile Island debuts — four tribes, one volcano of drama.',
    theme: t('#455a64', '#00838f', '#80cbc4', '#0b1517', '#1c3238', 'storm'),
  },
  {
    number: 13, title: 'Cook Islands', wikiPage: 'Survivor: Cook Islands',
    location: 'Aitutaki', country: 'Cook Islands',
    lat: -18.857, lng: -159.786, year: '2006',
    winner: 'Yul Kwon', winnerPage: 'Yul Kwon',
    tagline: 'The mutiny, the Aitu Four, and one of the great comeback runs.',
    theme: t('#00897b', '#f4511e', '#ffd180', '#04211d', '#0c3f38', 'island'),
  },
  {
    number: 14, title: 'Fiji', wikiPage: 'Survivor: Fiji',
    location: 'Vunivutu, Vanua Levu', country: 'Fiji',
    lat: -16.435, lng: 179.364, year: '2007',
    winner: 'Earl Cole', winnerPage: 'Earl Cole',
    tagline: 'Haves vs. have-nots — one camp feasts while the other starves.',
    theme: t('#6a1b9a', '#00acc1', '#b388ff', '#160726', '#2a1145', 'island'),
  },
  {
    number: 15, title: 'China', wikiPage: 'Survivor: China',
    location: 'Zhelin Lake, Jiangxi', country: 'China',
    lat: 29.033, lng: 115.108, year: '2007',
    winner: 'Todd Herzog', winnerPage: 'Todd Herzog',
    tagline: 'Temples on the lake — a masterclass season in an ancient land.',
    theme: t('#b71c1c', '#f9a825', '#ffd740', '#210404', '#3d0f0a', 'ruins'),
  },
  {
    number: 16, title: 'Micronesia', wikiPage: 'Survivor: Micronesia',
    location: 'Koror, Palau', country: 'Palau',
    lat: 7.19, lng: 134.36, year: '2008',
    winner: 'Parvati Shallow', winnerPage: 'Parvati Shallow',
    tagline: 'Fans vs. Favorites — the Black Widow Brigade devours everyone.',
    theme: t('#283593', '#e91e63', '#82b1ff', '#060a2b', '#141c52', 'ocean'),
  },
  {
    number: 17, title: 'Gabon', wikiPage: 'Survivor: Gabon',
    location: 'Wonga-Wongué Reserve', country: 'Gabon',
    lat: -0.606, lng: 9.399, year: '2008',
    winner: 'Bob Crowley', winnerPage: 'Bob Crowley',
    tagline: 'Earth’s last Eden — elephants, fake idols, and chaos on the savanna.',
    theme: t('#9e9d24', '#558b2f', '#ffee58', '#171c04', '#2c350c', 'savanna'),
  },
  {
    number: 18, title: 'Tocantins', wikiPage: 'Survivor: Tocantins',
    location: 'Jalapão', country: 'Brazil',
    lat: -10.565, lng: -46.755, year: '2009',
    winner: 'J.T. Thomas', winnerPage: 'James Thomas Jr.',
    tagline: 'The Brazilian highlands forge a perfect game — and Coach’s legend is born.',
    theme: t('#e65100', '#f9a825', '#ffcc80', '#251002', '#42200a', 'outback'),
  },
  {
    number: 19, title: 'Samoa', wikiPage: 'Survivor: Samoa',
    location: 'Upolu', country: 'Samoa',
    lat: -13.913, lng: -171.735, year: '2009',
    winner: 'Natalie White', winnerPage: 'Natalie White',
    tagline: 'Enter Russell Hantz — idols without clues and villainy without limits.',
    theme: t('#4527a0', '#7b1fa2', '#b39ddb', '#0d0521', '#1e0f3e', 'jungle'),
  },
  {
    number: 20, title: 'Heroes vs. Villains', wikiPage: 'Survivor: Heroes vs. Villains',
    location: 'Upolu, Samoa', country: 'Samoa',
    lat: -13.98, lng: -171.6, year: '2010',
    winner: 'Sandra Diaz-Twine', winnerPage: 'Sandra Diaz-Twine',
    tagline: 'Good vs. evil, legends colliding — the queen stays queen, twice.',
    theme: t('#0d47a1', '#b71c1c', '#ffd740', '#070716', '#22060a', 'storm'),
  },
  {
    number: 21, title: 'Nicaragua', wikiPage: 'Survivor: Nicaragua',
    location: 'San Juan del Sur', country: 'Nicaragua',
    lat: 11.253, lng: -85.87, year: '2010',
    winner: 'Jud "Fabio" Birza', winnerPage: 'Jud Birza',
    tagline: 'Old vs. young on the Pacific coast — and the great quitters’ exodus.',
    theme: t('#00796b', '#fbc02d', '#80cbc4', '#032220', '#0b403b', 'volcanic'),
  },
  {
    number: 22, title: 'Redemption Island', wikiPage: 'Survivor: Redemption Island',
    location: 'San Juan del Sur, Nicaragua', country: 'Nicaragua',
    lat: 11.36, lng: -85.74, year: '2011',
    winner: '"Boston Rob" Mariano', winnerPage: 'Rob Mariano',
    tagline: 'Voted out isn’t out — and Boston Rob finally completes the quest.',
    theme: t('#880e4f', '#4a148c', '#f48fb1', '#1c0313', '#360a26', 'volcanic'),
  },
  {
    number: 23, title: 'South Pacific', wikiPage: 'Survivor: South Pacific',
    location: 'Upolu, Samoa', country: 'Samoa',
    lat: -13.82, lng: -171.86, year: '2011',
    winner: 'Sophie Clarke', winnerPage: 'Sophie Clarke',
    tagline: 'Coach’s cult, Ozzy’s island exile, and a sleeper winner.',
    theme: t('#01579b', '#00695c', '#81d4fa', '#02101f', '#06283f', 'ocean'),
  },
  {
    number: 24, title: 'One World', wikiPage: 'Survivor: One World',
    location: 'Upolu, Samoa', country: 'Samoa',
    lat: -14.06, lng: -171.82, year: '2012',
    winner: 'Kim Spradlin', winnerPage: 'Kim Spradlin-Wolfe',
    tagline: 'Two tribes, one beach — and one of the most dominant wins ever.',
    theme: t('#ef6c00', '#6d4c41', '#ffcc80', '#241004', '#3f2008', 'island'),
  },
  {
    number: 25, title: 'Philippines', wikiPage: 'Survivor: Philippines',
    location: 'Caramoan', country: 'Philippines',
    lat: 13.764, lng: 123.862, year: '2012',
    winner: 'Denise Stapley', winnerPage: 'Denise Stapley',
    tagline: 'Three tribes, monsoon rains, and the woman who attended every Tribal.',
    theme: t('#c62828', '#1565c0', '#ffe082', '#1e0505', '#3a0d0d', 'storm'),
  },
  {
    number: 26, title: 'Caramoan', wikiPage: 'Survivor: Caramoan',
    location: 'Caramoan', country: 'Philippines',
    lat: 13.87, lng: 123.96, year: '2013',
    winner: 'John Cochran', winnerPage: 'John Cochran',
    tagline: 'Fans vs. Favorites II — the nerd becomes the perfect-game champion.',
    theme: t('#2e7d32', '#e65100', '#a5d6a7', '#07200a', '#123c14', 'island'),
  },
  {
    number: 27, title: 'Blood vs. Water', wikiPage: 'Survivor: Blood vs. Water',
    location: 'Palaui Island, Cagayan', country: 'Philippines',
    lat: 18.556, lng: 122.151, year: '2013',
    winner: 'Tyson Apostol', winnerPage: 'Tyson Apostol',
    tagline: 'Loved ones vs. each other — every vote cuts twice.',
    theme: t('#ad1457', '#004d40', '#f8bbd0', '#200411', '#3a0b20', 'ocean'),
  },
  {
    number: 28, title: 'Cagayan', wikiPage: 'Survivor: Cagayan',
    location: 'Cagayan', country: 'Philippines',
    lat: 18.42, lng: 121.97, year: '2014',
    winner: 'Tony Vlachos', winnerPage: 'Tony Vlachos',
    tagline: 'Brains vs. Brawn vs. Beauty — spy shacks, llama talk, total chaos.',
    theme: t('#f57f17', '#33691e', '#fff176', '#211703', '#3c2c07', 'jungle'),
  },
  {
    number: 29, title: 'San Juan del Sur', wikiPage: 'Survivor: San Juan del Sur',
    location: 'San Juan del Sur', country: 'Nicaragua',
    lat: 11.15, lng: -85.96, year: '2014',
    winner: 'Natalie Anderson', winnerPage: 'Natalie Anderson',
    tagline: 'Blood vs. Water II — a twin’s revenge served ice cold.',
    theme: t('#0288d1', '#f57c00', '#81d4fa', '#031522', '#083046', 'volcanic'),
  },
  {
    number: 30, title: 'Worlds Apart', wikiPage: 'Survivor: Worlds Apart',
    location: 'San Juan del Sur', country: 'Nicaragua',
    lat: 11.05, lng: -85.7, year: '2015',
    winner: 'Mike Holloway', winnerPage: 'Mike Holloway',
    tagline: 'White collar, blue collar, no collar — one man wins five straight immunities.',
    theme: t('#37474f', '#1565c0', '#90a4ae', '#0a1114', '#182830', 'storm'),
  },
  {
    number: 31, title: 'Cambodia', wikiPage: 'Survivor: Cambodia',
    location: 'Koh Rong', country: 'Cambodia',
    lat: 10.708, lng: 103.284, year: '2015',
    winner: 'Jeremy Collins', winnerPage: 'Jeremy Collins',
    tagline: 'Second Chance — voted back by the fans, playing like there’s no tomorrow.',
    theme: t('#00695c', '#bf360c', '#ffab91', '#032019', '#0a3b30', 'ruins'),
  },
  {
    number: 32, title: 'Kaôh Rōng', wikiPage: 'Survivor: Kaôh Rōng',
    location: 'Koh Rong', country: 'Cambodia',
    lat: 10.59, lng: 103.19, year: '2016',
    winner: 'Michele Fitzgerald', winnerPage: 'Michele Fitzgerald',
    tagline: 'The hottest season ever filmed — medevacs, meltdowns, and a jury shocker.',
    theme: t('#f9a825', '#00838f', '#fff59d', '#211a03', '#3d3007', 'jungle'),
  },
  {
    number: 33, title: 'Millennials vs. Gen X', wikiPage: 'Survivor: Millennials vs. Gen X',
    location: 'Mamanuca Islands', country: 'Fiji',
    ...fijiRing(0), year: '2016',
    winner: 'Adam Klein', winnerPage: 'Adam Klein',
    tagline: 'A generational war — and one of the most emotional wins in history.',
    theme: t('#5e35b1', '#00acc1', '#b39ddb', '#100526', '#221049', 'island'),
  },
  {
    number: 34, title: 'Game Changers', wikiPage: 'Survivor: Game Changers',
    location: 'Mamanuca Islands', country: 'Fiji',
    ...fijiRing(1), year: '2017',
    winner: 'Sarah Lacina', winnerPage: 'Sarah Lacina',
    tagline: 'Legends flip the game — advantages everywhere, no one is safe.',
    theme: t('#c62828', '#1565c0', '#ff8a80', '#1e0407', '#390b10', 'storm'),
  },
  {
    number: 35, title: 'Heroes vs. Healers vs. Hustlers', wikiPage: 'Survivor: Heroes vs. Healers vs. Hustlers',
    location: 'Mamanuca Islands', country: 'Fiji',
    ...fijiRing(2), year: '2017',
    winner: 'Ben Driebergen', winnerPage: 'Ben Driebergen',
    tagline: 'Ben bombs and idol after idol — a fire-making twist decides it all.',
    theme: t('#ef6c00', '#00838f', '#ffcc80', '#231103', '#3f2107', 'island'),
  },
  {
    number: 36, title: 'Ghost Island', wikiPage: 'Survivor: Ghost Island',
    location: 'Mamanuca Islands', country: 'Fiji',
    ...fijiRing(3), year: '2018',
    winner: 'Wendell Holland', winnerPage: 'Wendell Holland',
    tagline: 'Cursed relics return — and the first tie vote at Final Tribal Council.',
    theme: t('#00838f', '#4527a0', '#84ffff', '#031d21', '#08363d', 'ocean'),
  },
  {
    number: 37, title: 'David vs. Goliath', wikiPage: 'Survivor: David vs. Goliath',
    location: 'Mamanuca Islands', country: 'Fiji',
    ...fijiRing(4), year: '2018',
    winner: 'Nick Wilson', winnerPage: 'Nick Wilson',
    tagline: 'Underdogs vs. giants — idol nullifiers, slamtowns, and a modern classic.',
    theme: t('#1565c0', '#f9a825', '#90caf9', '#04101f', '#0a2440', 'storm'),
  },
  {
    number: 38, title: 'Edge of Extinction', wikiPage: 'Survivor: Edge of Extinction',
    location: 'Mamanuca Islands', country: 'Fiji',
    ...fijiRing(5), year: '2019',
    winner: 'Chris Underwood', winnerPage: 'Chris Underwood',
    tagline: 'Out of the game, back from the Edge — a return no one saw coming.',
    theme: t('#37474f', '#bf360c', '#ffab91', '#0b0f12', '#20140d', 'volcanic'),
  },
  {
    number: 39, title: 'Island of the Idols', wikiPage: 'Survivor: Island of the Idols',
    location: 'Mamanuca Islands', country: 'Fiji',
    ...fijiRing(6), year: '2019',
    winner: 'Tommy Sheehan', winnerPage: 'Tommy Sheehan',
    tagline: 'Boston Rob and Sandra as mentors — giant statues, giant lessons.',
    theme: t('#8d6e63', '#f9a825', '#ffd54f', '#1c1208', '#332211', 'ruins'),
  },
  {
    number: 40, title: 'Winners at War', wikiPage: 'Survivor: Winners at War',
    location: 'Mamanuca Islands', country: 'Fiji',
    ...fijiRing(7), year: '2020',
    winner: 'Tony Vlachos', winnerPage: 'Tony Vlachos',
    tagline: 'Twenty champions, two million dollars — the greatest field ever assembled.',
    theme: t('#212121', '#b8860b', '#ffd700', '#050505', '#1d1503', 'storm'),
  },
  {
    number: 41, title: 'Survivor 41', wikiPage: 'Survivor 41',
    location: 'Mamanuca Islands', country: 'Fiji',
    ...fijiRing(8), year: '2021',
    winner: 'Erika Casupanan', winnerPage: 'Erika Casupanan',
    tagline: 'A new era dawns — shorter, faster, more dangerous.',
    theme: t('#2e7d32', '#f9a825', '#b9f6ca', '#07200a', '#0f3a12', 'jungle'),
  },
  {
    number: 42, title: 'Survivor 42', wikiPage: 'Survivor 42',
    location: 'Mamanuca Islands', country: 'Fiji',
    ...fijiRing(9), year: '2022',
    winner: 'Maryanne Oketch', winnerPage: 'Maryanne Oketch',
    tagline: 'Joy as strategy — Maryanne’s idol reveal stuns the jury.',
    theme: t('#ef6c00', '#0277bd', '#ffe0b2', '#221003', '#3e1e06', 'island'),
  },
  {
    number: 43, title: 'Survivor 43', wikiPage: 'Survivor 43',
    location: 'Mamanuca Islands', country: 'Fiji',
    ...fijiRing(10), year: '2022',
    winner: 'Mike Gabler', winnerPage: 'Mike Gabler',
    tagline: 'A stealth game for the ages — and the million given to veterans.',
    theme: t('#00838f', '#e65100', '#80deea', '#031e22', '#073840', 'ocean'),
  },
  {
    number: 44, title: 'Survivor 44', wikiPage: 'Survivor 44',
    location: 'Mamanuca Islands', country: 'Fiji',
    ...fijiRing(11), year: '2023',
    winner: 'Yam Yam Arocho', winnerPage: 'Yamil Arocho',
    tagline: 'Birdcages, fake idols and charm — Yam Yam talks his way to the top.',
    theme: t('#ad1457', '#00897b', '#f48fb1', '#1f0412', '#380b22', 'island'),
  },
  {
    number: 45, title: 'Survivor 45', wikiPage: 'Survivor 45',
    location: 'Mamanuca Islands', country: 'Fiji',
    ...fijiRing(12), year: '2023',
    winner: 'Dee Valladares', winnerPage: 'Dee Valladares',
    tagline: 'Dee’s dominance — running the game while dating inside it.',
    theme: t('#1565c0', '#ef6c00', '#90caf9', '#040f20', '#0a2342', 'ocean'),
  },
  {
    number: 46, title: 'Survivor 46', wikiPage: 'Survivor 46',
    location: 'Mamanuca Islands', country: 'Fiji',
    ...fijiRing(13), year: '2024',
    winner: 'Kenzie Petty', winnerPage: 'Kenzie Petty',
    tagline: 'A chaotic cast for the ages — idols wasted, legends made.',
    theme: t('#558b2f', '#6a1b9a', '#c5e1a5', '#0e1c05', '#1c350c', 'jungle'),
  },
  {
    number: 47, title: 'Survivor 47', wikiPage: 'Survivor 47',
    location: 'Mamanuca Islands', country: 'Fiji',
    ...fijiRing(14), year: '2024',
    winner: 'Rachel LaMont', winnerPage: 'Rachel LaMont',
    tagline: 'Operation Italy and a clutch idol — Rachel closes like a champion.',
    theme: t('#0277bd', '#c62828', '#81d4fa', '#03121f', '#072a42', 'storm'),
  },
  {
    number: 48, title: 'Survivor 48', wikiPage: 'Survivor 48',
    location: 'Mamanuca Islands', country: 'Fiji',
    ...fijiRing(15), year: '2025',
    winner: 'Kyle Fraser', winnerPage: 'Kyle Fraser',
    tagline: 'The newest chapter in the new era of Survivor.',
    theme: t('#00897b', '#f9a825', '#80cbc4', '#032220', '#08403b', 'island'),
  },
  {
    number: 49, title: 'Survivor 49', wikiPage: 'Survivor 49',
    location: 'Mamanuca Islands', country: 'Fiji',
    ...fijiRing(16), year: '2025',
    winner: 'Savannah Louie', winnerPage: 'Savannah Louie',
    tagline: 'The last stop before 50 — and Savannah seizes the crown.',
    theme: t('#00695c', '#ef6c00', '#ffd180', '#032019', '#0a3a30', 'island'),
  },
  {
    number: 50, title: 'In the Hands of the Fans', wikiPage: 'Survivor 50: In the Hands of the Fans',
    location: 'Mamanuca Islands', country: 'Fiji',
    ...fijiRing(17), year: '2026',
    winner: 'Aubry Bracco', winnerPage: 'Aubry Bracco',
    tagline: 'Fifty seasons in the making — legends return, the fans call the shots, and $2,000,000 is on the line.',
    theme: t('#b8860b', '#8e0000', '#ffd700', '#0d0802', '#241a05', 'storm'),
  },
]

export const DEFAULT_THEME: SeasonTheme = t(
  '#d97b29', '#5d4037', '#ffb74d', '#120d08', '#241a10', 'island',
)

export const WIKI_BASE = 'https://survivor.fandom.com'

/** Filming hubs that hosted multiple seasons — shown as one medallion when zoomed out. */
export interface Cluster {
  id: string
  label: string
  lat: number
  lng: number
  seasons: number[]
}

export const CLUSTERS: Cluster[] = [
  { id: 'fiji', label: 'Fiji', lat: FIJI.lat, lng: FIJI.lng, seasons: [33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50] },
  { id: 'samoa', label: 'Samoa', lat: -13.94, lng: -171.77, seasons: [19, 20, 23, 24] },
  { id: 'nicaragua', label: 'Nicaragua', lat: 11.2, lng: -85.83, seasons: [21, 22, 29, 30] },
  { id: 'pearl-islands', label: 'Pearl Islands', lat: 8.3, lng: -79.06, seasons: [7, 8, 12] },
  { id: 'palau', label: 'Palau', lat: 7.27, lng: 134.42, seasons: [10, 16] },
  { id: 'cambodia', label: 'Cambodia', lat: 10.65, lng: 103.24, seasons: [31, 32] },
  { id: 'philippines', label: 'Philippines', lat: 16.1, lng: 123.0, seasons: [25, 26, 27, 28] },
]

/** Zoom level at which clusters burst apart into individual torches. */
export const CLUSTER_BREAK_ZOOM = 7
