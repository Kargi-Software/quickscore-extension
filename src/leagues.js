const LEAGUES = [ {
  id: "premier-league",
  name: "English Premier League",
  sport: "soccer",
  slug: "eng.1",
  country: "England"
}, {
  id: "laliga",
  name: "Spanish LALIGA",
  sport: "soccer",
  slug: "esp.1",
  country: "Spain"
}, {
  id: "serie-a",
  name: "Italian Serie A",
  sport: "soccer",
  slug: "ita.1",
  country: "Italy"
}, {
  id: "mls",
  name: "MLS",
  sport: "soccer",
  slug: "usa.1",
  country: "USA"
}, {
  id: "liga-mx",
  name: "Mexican Liga BBVA MX",
  sport: "soccer",
  slug: "mex.1",
  country: "Mexico"
}, {
  id: "womens-super-league",
  name: "English Women's Super League",
  sport: "soccer",
  slug: "eng.w.1",
  country: "England"
}, {
  id: "bundesliga",
  name: "German Bundesliga",
  sport: "soccer",
  slug: "ger.1",
  country: "Germany"
}, {
  id: "ligue-1",
  name: "French Ligue 1",
  sport: "soccer",
  slug: "fra.1",
  country: "France"
}, {
  id: "nwsl",
  name: "NWSL",
  sport: "soccer",
  slug: "usa.nwsl",
  country: "USA"
}, {
  id: "championship",
  name: "English League Championship",
  sport: "soccer",
  slug: "eng.2",
  country: "England"
}, {
  id: "leagues-cup",
  name: "Leagues Cup",
  sport: "soccer",
  slug: "concacaf.leagues.cup",
  country: null
}, {
  id: "costa-rica-primera",
  name: "Costa Rican Primera Division",
  sport: "soccer",
  slug: "crc.1",
  country: "Costa Rica"
}, {
  id: "honduras-liga",
  name: "Honduran Liga Nacional",
  sport: "soccer",
  slug: "hon.1",
  country: "Honduras"
}, {
  id: "usl-championship",
  name: "USL Championship",
  sport: "soccer",
  slug: "usa.usl.1",
  country: "USA"
}, {
  id: "usl-cup",
  name: "USL Cup",
  sport: "soccer",
  slug: "usa.usl.l1.cup",
  country: "USA"
}, {
  id: "concacaf-central-american-cup",
  name: "Concacaf Central American Cup",
  sport: "soccer",
  slug: "concacaf.central.american.cup",
  country: null
}, {
  id: "nwsl-challenge-cup",
  name: "NWSL Challenge Cup",
  sport: "soccer",
  slug: "usa.nwsl.cup",
  country: "USA"
}, {
  id: "concacaf-w-champions-cup",
  name: "Concacaf W Champions Cup",
  sport: "soccer",
  slug: "concacaf.w.champions_cup",
  country: null
}, {
  id: "ncaa-womens",
  name: "NCAA Women's Soccer",
  sport: "soccer",
  slug: "usa.ncaa.w.1",
  country: "USA"
}, {
  id: "us-open-cup",
  name: "U.S. Open Cup",
  sport: "soccer",
  slug: "usa.open",
  country: "USA"
}, {
  id: "liga-mx-expansion",
  name: "Mexican Liga de Expansión MX",
  sport: "soccer",
  slug: "mex.2",
  country: "Mexico"
}, {
  id: "concacaf-champions",
  name: "Concacaf Champions Cup",
  sport: "soccer",
  slug: "concacaf.champions",
  country: null
}, {
  id: "guatemala-liga",
  name: "Guatemalan Liga Nacional",
  sport: "soccer",
  slug: "gua.1",
  country: "Guatemala"
}, {
  id: "el-salvador-primera",
  name: "Salvadoran Primera Division",
  sport: "soccer",
  slug: "slv.1",
  country: "El Salvador"
}, {
  id: "usl-league-one",
  name: "USL League One",
  sport: "soccer",
  slug: "usa.usl.l1",
  country: "USA"
}, {
  id: "ncaa-mens",
  name: "NCAA Men's Soccer",
  sport: "soccer",
  slug: "usa.ncaa.m.1",
  country: "USA"
}, {
  id: "usl-super-league",
  name: "USL Super League",
  sport: "soccer",
  slug: "usa.w.usl.1",
  country: "USA"
}, {
  id: "northern-super-league",
  name: "Northern Super League",
  sport: "soccer",
  slug: "can.w.nsl",
  country: "Canada"
}, {
  id: "copa-del-rey",
  name: "Spanish Copa del Rey",
  sport: "soccer",
  slug: "esp.copa_del_rey",
  country: "Spain"
}, {
  id: "dfb-pokal",
  name: "German Cup",
  sport: "soccer",
  slug: "ger.dfb_pokal",
  country: "Germany"
}, {
  id: "coppa-italia",
  name: "Coppa Italia",
  sport: "soccer",
  slug: "ita.coppa_italia",
  country: "Italy"
}, {
  id: "coupe-de-france",
  name: "Coupe de France",
  sport: "soccer",
  slug: "fra.coupe_de_france",
  country: "France"
}, {
  id: "taca-portugal",
  name: "Taca de Portugal",
  sport: "soccer",
  slug: "por.taca.portugal",
  country: "Portugal"
}, {
  id: "knvb-beker",
  name: "Dutch KNVB Beker",
  sport: "soccer",
  slug: "ned.cup",
  country: "Netherlands"
}, {
  id: "belgian-pro-league",
  name: "Belgian Pro League",
  sport: "soccer",
  slug: "bel.1",
  country: "Belgium"
}, {
  id: "scottish-cup",
  name: "Scottish Cup",
  sport: "soccer",
  slug: "sco.tennents",
  country: "Scotland"
}, {
  id: "scottish-challenge-cup",
  name: "Scottish League Challenge Cup",
  sport: "soccer",
  slug: "sco.challenge",
  country: "Scotland"
}, {
  id: "super-lig",
  name: "Turkish Super Lig",
  sport: "soccer",
  slug: "tur.1",
  country: "Turkey"
}, {
  id: "austrian-bundesliga",
  name: "Austrian Bundesliga",
  sport: "soccer",
  slug: "aut.1",
  country: "Austria"
}, {
  id: "eliteserien",
  name: "Norwegian Eliteserien",
  sport: "soccer",
  slug: "nor.1",
  country: "Norway"
}, {
  id: "laliga2",
  name: "Spanish LALIGA 2",
  sport: "soccer",
  slug: "esp.2",
  country: "Spain"
}, {
  id: "serie-b",
  name: "Italian Serie B",
  sport: "soccer",
  slug: "ita.2",
  country: "Italy"
}, {
  id: "keuken-kampioen",
  name: "Dutch Keuken Kampioen Divisie",
  sport: "soccer",
  slug: "ned.2",
  country: "Netherlands"
}, {
  id: "league-two",
  name: "English League Two",
  sport: "soccer",
  slug: "eng.4",
  country: "England"
}, {
  id: "national-league",
  name: "English National League",
  sport: "soccer",
  slug: "eng.5",
  country: "England"
}, {
  id: "europa-league-qual",
  name: "UEFA Europa League Qualifying",
  sport: "soccer",
  slug: "uefa.europa_qual",
  country: null
}, {
  id: "womens-fa-cup",
  name: "English Women's FA Cup",
  sport: "soccer",
  slug: "eng.w.fa",
  country: "England"
}, {
  id: "copa-reina",
  name: "Spanish Copa de la Reina",
  sport: "soccer",
  slug: "esp.copa_de_la_reina",
  country: "Spain"
}, {
  id: "vrouwen-eredivisie",
  name: "Dutch Vrouwen Eredivisie",
  sport: "soccer",
  slug: "ned.w.1",
  country: "Netherlands"
}, {
  id: "primeira-liga",
  name: "Portuguese Primeira Liga",
  sport: "soccer",
  slug: "por.1",
  country: "Portugal"
}, {
  id: "eredivisie",
  name: "Dutch Eredivisie",
  sport: "soccer",
  slug: "ned.1",
  country: "Netherlands"
}, {
  id: "russian-premier",
  name: "Russian Premier League",
  sport: "soccer",
  slug: "rus.1",
  country: "Russia"
}, {
  id: "scottish-premiership",
  name: "Scottish Premiership",
  sport: "soccer",
  slug: "sco.1",
  country: "Scotland"
}, {
  id: "scottish-league-cup",
  name: "Scottish League Cup",
  sport: "soccer",
  slug: "sco.cis",
  country: "Scotland"
}, {
  id: "scottish-championship",
  name: "Scottish Championship",
  sport: "soccer",
  slug: "sco.2",
  country: "Scotland"
}, {
  id: "greek-super-league",
  name: "Greek Super League",
  sport: "soccer",
  slug: "gre.1",
  country: "Greece"
}, {
  id: "danish-superliga",
  name: "Danish Superliga",
  sport: "soccer",
  slug: "den.1",
  country: "Denmark"
}, {
  id: "allsvenskan",
  name: "Swedish Allsvenskan",
  sport: "soccer",
  slug: "swe.1",
  country: "Sweden"
}, {
  id: "bundesliga-2",
  name: "German 2. Bundesliga",
  sport: "soccer",
  slug: "ger.2",
  country: "Germany"
}, {
  id: "ligue-2",
  name: "French Ligue 2",
  sport: "soccer",
  slug: "fra.2",
  country: "France"
}, {
  id: "league-one",
  name: "English League One",
  sport: "soccer",
  slug: "eng.3",
  country: "England"
}, {
  id: "efl-trophy",
  name: "English EFL Trophy",
  sport: "soccer",
  slug: "eng.trophy",
  country: "England"
}, {
  id: "champions-league-qual",
  name: "UEFA Champions League Qualifying",
  sport: "soccer",
  slug: "uefa.champions_qual",
  country: null
}, {
  id: "conference-league-qual",
  name: "UEFA Conference League Qualifying",
  sport: "soccer",
  slug: "uefa.europa.conf_qual",
  country: null
}, {
  id: "liga-f",
  name: "Spanish Liga F",
  sport: "soccer",
  slug: "esp.w.1",
  country: "Spain"
}, {
  id: "premiere-ligue",
  name: "French Première Ligue",
  sport: "soccer",
  slug: "fra.w.1",
  country: "France"
}, {
  id: "knvb-beker-vrouwen",
  name: "Dutch KNVB Beker Vrouwen",
  sport: "soccer",
  slug: "ned.w.knvb_cup",
  country: "Netherlands"
}, {
  id: "womens-champions-league",
  name: "UEFA Women's Champions League",
  sport: "soccer",
  slug: "uefa.wchampions",
  country: null
}, {
  id: "champions-league",
  name: "UEFA Champions League",
  sport: "soccer",
  slug: "uefa.champions",
  country: null
}, {
  id: "europa-league",
  name: "UEFA Europa League",
  sport: "soccer",
  slug: "uefa.europa",
  country: null
}, {
  id: "conference-league",
  name: "UEFA Conference League",
  sport: "soccer",
  slug: "uefa.europa.conf",
  country: null
}, {
  id: "carabao-cup",
  name: "English Carabao Cup",
  sport: "soccer",
  slug: "eng.league_cup",
  country: "England"
}, {
  id: "fa-cup",
  name: "English FA Cup",
  sport: "soccer",
  slug: "eng.fa",
  country: "England"
}, {
  id: "argentina-primera",
  name: "Argentine Liga Profesional de Fútbol",
  sport: "soccer",
  slug: "arg.1",
  country: "Argentina"
}, {
  id: "argentina-nacional-b",
  name: "Argentine Nacional B",
  sport: "soccer",
  slug: "arg.2",
  country: "Argentina"
}, {
  id: "argentina-primera-b",
  name: "Argentine Primera B",
  sport: "soccer",
  slug: "arg.3",
  country: "Argentina"
}, {
  id: "copa-argentina",
  name: "Copa Argentina",
  sport: "soccer",
  slug: "arg.copa",
  country: "Argentina"
}, {
  id: "brasileirao",
  name: "Brazilian Serie A",
  sport: "soccer",
  slug: "bra.1",
  country: "Brazil"
}, {
  id: "brasileirao-b",
  name: "Brazilian Serie B",
  sport: "soccer",
  slug: "bra.2",
  country: "Brazil"
}, {
  id: "copa-do-brasil",
  name: "Copa do Brasil",
  sport: "soccer",
  slug: "bra.copa_do_brazil",
  country: "Brazil"
}, {
  id: "camp-gaucho",
  name: "Brazilian Campeonato Gaucho",
  sport: "soccer",
  slug: "bra.camp.gaucho",
  country: "Brazil"
}, {
  id: "camp-paulista",
  name: "Brazilian Campeonato Paulista",
  sport: "soccer",
  slug: "bra.camp.paulista",
  country: "Brazil"
}, {
  id: "camp-carioca",
  name: "Brazilian Campeonato Carioca",
  sport: "soccer",
  slug: "bra.camp.carioca",
  country: "Brazil"
}, {
  id: "camp-mineiro",
  name: "Brazilian Campeonato Mineiro",
  sport: "soccer",
  slug: "bra.camp.mineiro",
  country: "Brazil"
}, {
  id: "colombia-primera",
  name: "Colombian Primera A",
  sport: "soccer",
  slug: "col.1",
  country: "Colombia"
}, {
  id: "copa-colombia",
  name: "Copa Colombia",
  sport: "soccer",
  slug: "col.copa",
  country: "Colombia"
}, {
  id: "chile-primera",
  name: "Chilean Primera División",
  sport: "soccer",
  slug: "chi.1",
  country: "Chile"
}, {
  id: "copa-chile",
  name: "Copa Chile",
  sport: "soccer",
  slug: "chi.copa_chi",
  country: "Chile"
}, {
  id: "paraguay-primera",
  name: "Paraguayan Primera División",
  sport: "soccer",
  slug: "par.1",
  country: "Paraguay"
}, {
  id: "peru-liga-1",
  name: "Peruvian Liga 1",
  sport: "soccer",
  slug: "per.1",
  country: "Peru"
}, {
  id: "bolivia-liga",
  name: "Bolivian Liga Profesional",
  sport: "soccer",
  slug: "bol.1",
  country: "Bolivia"
}, {
  id: "ecuador-liga-pro",
  name: "LigaPro Ecuador",
  sport: "soccer",
  slug: "ecu.1",
  country: "Ecuador"
}, {
  id: "uruguay-primera",
  name: "Liga AUF Uruguaya",
  sport: "soccer",
  slug: "uru.1",
  country: "Uruguay"
}, {
  id: "venezuela-primera",
  name: "Venezuelan Primera División",
  sport: "soccer",
  slug: "ven.1",
  country: "Venezuela"
}, {
  id: "libertadores",
  name: "CONMEBOL Libertadores",
  sport: "soccer",
  slug: "conmebol.libertadores",
  country: null
}, {
  id: "sudamericana",
  name: "CONMEBOL Sudamericana",
  sport: "soccer",
  slug: "conmebol.sudamericana",
  country: null
}, {
  id: "a-league-men",
  name: "Australian A-League Men",
  sport: "soccer",
  slug: "aus.1",
  country: "Australia"
}, {
  id: "a-league-women",
  name: "Australian A-League Women",
  sport: "soccer",
  slug: "aus.w.1",
  country: "Australia"
}, {
  id: "chinese-super-league",
  name: "Chinese Super League",
  sport: "soccer",
  slug: "chn.1",
  country: "China"
}, {
  id: "indian-super-league",
  name: "Indian Super League",
  sport: "soccer",
  slug: "ind.1",
  country: "India"
}, {
  id: "indian-i-league",
  name: "Indian I-League",
  sport: "soccer",
  slug: "ind.2",
  country: "India"
}, {
  id: "saudi-pro-league",
  name: "Saudi Pro League",
  sport: "soccer",
  slug: "ksa.1",
  country: "Saudi Arabia"
}, {
  id: "j-league",
  name: "Japanese J.League",
  sport: "soccer",
  slug: "jpn.1",
  country: "Japan"
}, {
  id: "afc-champions",
  name: "AFC Champions League Elite",
  sport: "soccer",
  slug: "afc.champions",
  country: null
}, {
  id: "caf-champions",
  name: "CAF Champions League",
  sport: "soccer",
  slug: "caf.champions",
  country: null
}, {
  id: "caf-confed",
  name: "CAF Confederation Cup",
  sport: "soccer",
  slug: "caf.confed",
  country: null
}, {
  id: "south-africa-psl",
  name: "South African Premiership",
  sport: "soccer",
  slug: "rsa.1",
  country: "South Africa"
}, {
  id: "world-cup",
  name: "FIFA World Cup",
  sport: "soccer",
  slug: "fifa.world",
  country: null
}, {
  id: "world-cup-q-uefa",
  name: "FIFA World Cup Qualifying - UEFA",
  sport: "soccer",
  slug: "fifa.worldq.uefa",
  country: null
}, {
  id: "world-cup-q-conmebol",
  name: "FIFA World Cup Qualifying - CONMEBOL",
  sport: "soccer",
  slug: "fifa.worldq.conmebol",
  country: null
}, {
  id: "world-cup-q-afc",
  name: "FIFA World Cup Qualifying - AFC",
  sport: "soccer",
  slug: "fifa.worldq.afc",
  country: null
}, {
  id: "world-cup-q-concacaf",
  name: "FIFA World Cup Qualifying - Concacaf",
  sport: "soccer",
  slug: "fifa.worldq.concacaf",
  country: null
}, {
  id: "world-cup-q-caf",
  name: "FIFA World Cup Qualifying - CAF",
  sport: "soccer",
  slug: "fifa.worldq.caf",
  country: null
}, {
  id: "world-cup-u17",
  name: "FIFA Under-17 World Cup",
  sport: "soccer",
  slug: "fifa.world.u17",
  country: null
}, {
  id: "world-cup-u20",
  name: "FIFA Under-20 World Cup",
  sport: "soccer",
  slug: "fifa.world.u20",
  country: null
}, {
  id: "womens-friendly",
  name: "Women's International Friendly",
  sport: "soccer",
  slug: "fifa.friendly.w",
  country: null
}, {
  id: "uefa-euro",
  name: "UEFA European Championship",
  sport: "soccer",
  slug: "uefa.euro",
  country: null
}, {
  id: "uefa-euro-qual",
  name: "UEFA European Championship Qualifying",
  sport: "soccer",
  slug: "uefa.euroq",
  country: null
}, {
  id: "uefa-nations",
  name: "UEFA Nations League",
  sport: "soccer",
  slug: "uefa.nations",
  country: null
}, {
  id: "uefa-w-nations",
  name: "UEFA Women's Nations League",
  sport: "soccer",
  slug: "uefa.w.nations",
  country: null
}, {
  id: "euro-u21",
  name: "UEFA European Under-21 Championship",
  sport: "soccer",
  slug: "uefa.euro_u21",
  country: null
}, {
  id: "euro-u21-qual",
  name: "UEFA European Under-21 Championship Qualifying",
  sport: "soccer",
  slug: "uefa.euro_u21_qual",
  country: null
}, {
  id: "euro-u19",
  name: "UEFA European Under-19 Championship",
  sport: "soccer",
  slug: "uefa.euro.u19",
  country: null
}, {
  id: "womens-euro",
  name: "UEFA Women's European Championship",
  sport: "soccer",
  slug: "uefa.weuro",
  country: null
}, {
  id: "gold-cup",
  name: "Concacaf Gold Cup",
  sport: "soccer",
  slug: "concacaf.gold",
  country: null
}, {
  id: "concacaf-nations-league",
  name: "Concacaf Nations League",
  sport: "soccer",
  slug: "concacaf.nations.league",
  country: null
}, {
  id: "concacaf-w-gold-cup",
  name: "Concacaf W Gold Cup",
  sport: "soccer",
  slug: "concacaf.w.gold",
  country: null
}, {
  id: "concacaf-w-championship",
  name: "Concacaf W Championship",
  sport: "soccer",
  slug: "concacaf.womens.championship",
  country: null
}, {
  id: "copa-america",
  name: "Copa América",
  sport: "soccer",
  slug: "conmebol.america",
  country: null
}, {
  id: "copa-america-femenina",
  name: "Copa América Femenina",
  sport: "soccer",
  slug: "conmebol.america.femenina",
  country: null
}, {
  id: "afcon",
  name: "Africa Cup of Nations",
  sport: "soccer",
  slug: "caf.nations",
  country: "Africa"
}, {
  id: "afcon-qual",
  name: "Africa Cup of Nations Qualifying",
  sport: "soccer",
  slug: "caf.nations_qual",
  country: "Africa"
}, {
  id: "african-nations-championship",
  name: "African Nations Championship",
  sport: "soccer",
  slug: "caf.championship",
  country: "Africa"
}, {
  id: "womens-afcon",
  name: "Women's Africa Cup of Nations",
  sport: "soccer",
  slug: "caf.w.nations",
  country: "Africa"
}, {
  id: "afc-asian-cup",
  name: "AFC Asian Cup",
  sport: "soccer",
  slug: "afc.asian.cup",
  country: null
}, {
  id: "afc-asian-cup-qual",
  name: "AFC Asian Cup Qualifiers",
  sport: "soccer",
  slug: "afc.cupq",
  country: null
}, {
  id: "saff-championship",
  name: "SAFF Championship",
  sport: "soccer",
  slug: "afc.saff.championship",
  country: null
}, {
  id: "asean-united",
  name: "ASEAN United FC",
  sport: "soccer",
  slug: "aff.championship",
  country: null
}, {
  id: "club-world-cup",
  name: "FIFA Club World Cup",
  sport: "soccer",
  slug: "fifa.cwc",
  country: null
}, {
  id: "intercontinental-cup",
  name: "FIFA Intercontinental Cup",
  sport: "soccer",
  slug: "fifa.intercontinental_cup",
  country: null
}, {
  id: "olympics-mens",
  name: "Men's Olympic Soccer Tournament",
  sport: "soccer",
  slug: "fifa.olympics",
  country: null
}, {
  id: "olympics-womens",
  name: "Women's Olympic Soccer Tournament",
  sport: "soccer",
  slug: "fifa.w.olympics",
  country: null
}, {
  id: "womens-world-cup",
  name: "FIFA Women's World Cup",
  sport: "soccer",
  slug: "fifa.wwc",
  country: null
}, {
  id: "wwc-qual-uefa",
  name: "FIFA Women's World Cup Qualifying - UEFA",
  sport: "soccer",
  slug: "fifa.wworldq.uefa",
  country: null
}, {
  id: "womens-world-cup-u17",
  name: "FIFA Under-17 Women's World Cup",
  sport: "soccer",
  slug: "fifa.wworld.u17",
  country: null
}, {
  id: "shebelieves-cup",
  name: "SheBelieves Cup",
  sport: "soccer",
  slug: "fifa.shebelieves",
  country: null
}, {
  id: "pinatar-cup",
  name: "Pinatar Cup",
  sport: "soccer",
  slug: "global.pinatar_cup",
  country: null
}, {
  id: "friendly",
  name: "International Friendly",
  sport: "soccer",
  slug: "fifa.friendly",
  country: null
}, {
  id: "nba",
  name: "NBA",
  sport: "basketball",
  slug: "nba",
  country: "United States"
}, {
  id: "nfl",
  name: "NFL",
  sport: "football",
  slug: "nfl",
  country: "United States"
}, {
  id: "mlb",
  name: "MLB",
  sport: "baseball",
  slug: "mlb",
  country: "United States"
}, {
  id: "nhl",
  name: "NHL",
  sport: "hockey",
  slug: "nhl",
  country: "United States"
} ];

const SPORT_DISPLAY_NAMES = {
  soccer: "Football",
  football: "American Football",
  basketball: "Basketball",
  baseball: "Baseball",
  hockey: "Hockey"
};

const LeaguesData = {
  LEAGUES: LEAGUES,
  getLeagueById(id) {
    return LEAGUES.find(l => l.id === id) || null;
  },
  getLeagueBySlug(slug) {
    if (!slug) return null;
    return LEAGUES.find(l => l.slug === slug) || null;
  },
  getLeaguesByIds(ids) {
    const idSet = new Set(ids || []);
    return LEAGUES.filter(l => idSet.has(l.id));
  },
  sportDisplayName(sport) {
    return SPORT_DISPLAY_NAMES[sport] || sport;
  },
  searchLeagues(query, excludeIds = []) {
    const text = String(query || "").trim().toLowerCase();
    const excludeSet = new Set(excludeIds);
    return LEAGUES.filter(l => !excludeSet.has(l.id)).filter(l => {
      if (!text) return true;
      return l.name.toLowerCase().includes(text) || l.sport.toLowerCase().includes(text) || l.slug.toLowerCase().includes(text);
    }).sort((a, b) => a.name.localeCompare(b.name));
  }
};

if (typeof window !== "undefined") {
  window.LeaguesData = LeaguesData;
} else {
  self.LeaguesData = LeaguesData;
}