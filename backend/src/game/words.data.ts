// O'yin so'zlari — har bir kategoriyada juft so'zlar (common, imposter)
export interface WordPair {
  common: string;
  imposter: string;
}

export const WORD_PAIRS: WordPair[] = [
  // Hayvonlar
  { common: 'MUSHUK', imposter: 'IT' },
  { common: 'SHEʼR', imposter: 'LEOPARD' },
  { common: 'OT', imposter: 'ESHAK' },
  { common: 'TOVUQ', imposter: 'OʻRDEK' },
  { common: 'QOʻY', imposter: 'ECHKI' },
  { common: 'SIGʻIR', imposter: 'BUQA' },
  { common: 'BOʻRI', imposter: 'TULKI' },
  { common: 'AYIQ', imposter: 'POʻRSUQ' },
  { common: 'BURGUT', imposter: 'LOCHIN' },
  { common: 'BALIQ', imposter: 'BAQALQOʻYT' },

  // Oziq-ovqat
  { common: 'NON', imposter: 'LAVASH' },
  { common: 'SHОʻRVA', imposter: 'OʻRTIQ' },
  { common: 'GURUCH', imposter: 'NOʻXAT' },
  { common: 'OLMAr', imposter: 'NOM' },
  { common: 'TOMAT', imposter: 'QOVOQ' },
  { common: 'TUXUM', imposter: 'PENCHAʼK' },
  { common: 'OʻRIK', imposter: 'SHAFTOLI' },
  { common: 'SOʻM', imposter: 'PIYOZ' },

  // Transport
  { common: 'MASHINA', imposter: 'MOTOTSIKL' },
  { common: 'AVTOBUS', imposter: 'TRAMVAY' },
  { common: 'SAMOLYOT', imposter: 'VERTOLYOT' },
  { common: 'KEMA', imposter: 'QAYIQ' },
  { common: 'VELOSIPED', imposter: 'SCOOTER' },
  { common: 'METRO', imposter: 'TROLLEYBUS' },
  { common: 'YOʻL-YOʻRIQ', imposter: 'TOʻXTOV' },

  // Sport
  { common: 'FUTBOL', imposter: 'REGBI' },
  { common: 'BASKETBOL', imposter: 'VOLEYBOL' },
  { common: 'SUZISH', imposter: 'CHOʻMILISH' },
  { common: 'TENNIS', imposter: 'BADMINTON' },
  { common: 'BOKS', imposter: 'KARAʼTE' },
  { common: 'SHAXMAT', imposter: 'SHASHKA' },

  // Meva-sabzavot
  { common: 'TARVUZ', imposter: 'QOVUN' },
  { common: 'LIMON', imposter: 'APELSIN' },
  { common: 'UZUM', imposter: 'ANJIR' },
  { common: 'SABZI', imposter: 'SHOLʻG\'AM' },
  { common: 'BODRING', imposter: 'QOVOQCHA' },

  // Kundalik hayot
  { common: 'KITOB', imposter: 'JURNAL' },
  { common: 'TELEFON', imposter: 'PLANSHET' },
  { common: 'STOL', imposter: 'SHKAF' },
  { common: 'KROʻVAT', imposter: 'DIVAN' },
  { common: 'DERAZА', imposter: 'ESHIK' },
  { common: 'SUMKA', imposter: 'PORTFEL' },
  { common: 'KIYIM', imposter: 'KOSTYUM' },
  { common: 'SOAT', imposter: 'TAQINCHOQ' },
];

export function getRandomWordPair(category?: string): WordPair {
  const pairs = WORD_PAIRS;
  return pairs[Math.floor(Math.random() * pairs.length)];
}
