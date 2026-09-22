"""Hand-curated decisions used by build_feud.py."""

# Whole-word spelling fixes (lowercase key -> replacement). Built by running
# pyspellchecker over every word, then keeping only unambiguous typos after
# reading each word in context. Proper nouns, slang, brand names and
# show-board abbreviations are deliberately left alone.
SPELLING = {
    "accessry": "accessory", "acquarium": "aquarium", "afghanastan": "afghanistan",
    "agulera": "aguilera", "airplain": "airplane", "alcochol": "alcohol", "alot": "a lot",
    "amiance": "ambiance", "aplicator": "applicator", "arguement": "argument",
    "asprin": "aspirin", "associat": "associate", "atrractive": "attractive",
    "austrailia": "australia", "austrailian": "australian", "babbermouth": "blabbermouth",
    "backgroung": "background", "bagles": "bagels", "baliff": "bailiff",
    "barishnikov": "baryshnikov", "batchelor": "bachelor", "benidict": "benedict",
    "berrymore": "barrymore", "beiber": "bieber", "bilbs": "bulbs", "bilkes": "bikes",
    "blakets": "blankets", "bloded": "blooded", "bodygaurd": "bodyguard",
    "boisenberry": "boysenberry", "bouqueu": "bouquet", "bridemaids": "bridesmaids",
    "broccili": "broccoli", "buritto": "burrito", "buscuit": "biscuit",
    "cadilac": "cadillac", "camaras": "cameras", "cannoil": "cannoli",
    "carribean": "caribbean", "cataloupe": "cantaloupe", "cemetry": "cemetery",
    "chaffeur": "chauffeur", "cheeta": "cheetah", "chihauhua": "chihuahua",
    "chiminy": "chimney", "chronicals": "chronicles", "cibatta": "ciabatta",
    "classs": "class", "claustrophia": "claustrophobia", "clorine": "chlorine",
    "coffe": "coffee", "collecter": "collector", "commerical": "commercial",
    "compters": "computers", "consession": "concession", "contantly": "constantly",
    "counterfit": "counterfeit", "coupld": "could", "coursage": "corsage",
    "coyboy": "cowboy", "cuttery": "cutlery", "dalamatian": "dalmatian",
    "dalmation": "dalmatian", "dalmations": "dalmatians", "dashound": "dachshund",
    "deoderant": "deodorant", "dirtry": "dirty", "doonsbury": "doonesbury",
    "dungeos": "dungeons", "embarass": "embarrass", "embarassed": "embarrassed",
    "enchaladas": "enchiladas", "erlier": "earlier", "esspresso": "espresso",
    "etes": "eyes", "excure": "excuse", "execising": "exercising",
    "exersice": "exercise", "expeirience": "experience", "fettucini": "fettuccine",
    "finggers": "fingers", "fistfull": "fistful", "flashung": "flashing",
    "florance": "florence", "fodgety": "fidgety", "foebid": "forbid",
    "forcast": "forecast", "fornt": "front", "frige": "fridge", "friiends": "friends",
    "fued": "feud", "funachello": "funicello", "funiture": "furniture",
    "garfunkle": "garfunkel", "gass": "gas", "geoge": "george", "giills": "gills",
    "governer": "governor", "grandalf": "gandalf", "greatful": "grateful",
    "grommit": "gromit", "guage": "gauge", "habbits": "habits", "haloween": "halloween",
    "hambugers": "hamburgers", "hamburders": "hamburgers", "hawii": "hawaii",
    "headress": "headdress", "himilaysa": "himalayas", "hioneymoon": "honeymoon",
    "hippopotamous": "hippopotamus", "hippoptamus": "hippopotamus",
    "horsehoe": "horseshoe", "hughs": "hughes", "hydrarnt": "hydrant",
    "hygeine": "hygiene", "imagninary": "imaginary", "insruments": "instruments",
    "interupt": "interrupt", "isreal": "israel", "jehovas": "jehovah's",
    "jewelery": "jewelry", "jewlery": "jewelry", "jogns": "johns", "kepp": "keep",
    "lisence": "license", "lizzard": "lizard", "lolipop": "lollipop", "lomg": "long",
    "loyality": "loyalty", "maintainance": "maintenance", "maight": "might",
    "maka": "make", "makign": "making", "malcom": "malcolm",
    "malfunctn": "malfunction", "marhmellow": "marshmallow", "marshmellow": "marshmallow",
    "marshmellows": "marshmallows", "matereal": "material", "michaelangelo": "michelangelo",
    "milage": "mileage", "minkey": "monkey", "minniapolis": "minneapolis",
    "miusic": "music", "mlitary": "military", "momories": "memories",
    "monsy": "money", "mouothwash": "mouthwash", "napolean": "napoleon",
    "niagra": "niagara", "nickleson": "nicholson", "nmusic": "music",
    "novacaine": "novocaine", "nternet": "internet", "numaric": "numeric",
    "occassion": "occasion", "oboma": "obama", "oleeans": "orleans",
    "oporator": "operator", "oppenent": "opponent", "ordor": "odor",
    "pantings": "paintings", "papaer": "paper", "papya": "papaya", "parcle": "parcel",
    "parnts": "parents", "pasttime": "pastime", "peoiple": "people",
    "perfomer": "performer", "perscription": "prescription", "persuit": "pursuit",
    "pharmicist": "pharmacist", "pilgrem": "pilgrim", "pinapple": "pineapple",
    "pittsburg": "pittsburgh", "planae": "plane", "plegde": "pledge",
    "poatmeal": "oatmeal", "poatoes": "potatoes", "politition": "politician",
    "polor": "polar", "preperation": "preparation", "proctocologist": "proctologist",
    "proffesor": "professor", "pumkin": "pumpkin", "raegan": "reagan",
    "raisons": "raisins", "rebelious": "rebellious", "reherse": "rehearse",
    "religous": "religious", "repelant": "repellent", "resposibility": "responsibility",
    "resteraunt": "restaurant", "restles": "restless", "reslish": "relish",
    "sagd": "sagging", "saleman": "salesman", "sandle": "sandal",
    "sandwhich": "sandwich", "sanswiches": "sandwiches", "sapronas": "sopranos",
    "satelite": "satellite", "saxaphone": "saxophone", "saxiphone": "saxophone",
    "schwartzenager": "schwarzenegger", "servents": "servants",
    "shakespear": "shakespeare", "shakesphere": "shakespeare", "shephard": "shepherd",
    "sinkong": "sinking", "skiiers": "skiers", "snneze": "sneeze", "snorkle": "snorkel",
    "someting": "something", "soemthing": "something", "souveniers": "souvenirs",
    "spanial": "spaniel", "specfic": "specific", "specif": "specific",
    "spokeperson": "spokesperson", "sqirrel": "squirrel", "steaking": "stealing",
    "stethescope": "stethoscope", "streisan": "streisand", "stressfull": "stressful",
    "strorm": "storm", "suess": "seuss", "symphany": "symphony", "sympton": "symptom",
    "tast": "taste", "tatoo": "tattoo", "tchaikovsy": "tchaikovsky",
    "telapathy": "telepathy", "tellahassee": "tallahassee", "tenessee": "tennessee",
    "terot": "tarot", "thearre": "theatre", "thenselves": "themselves", "thet": "they",
    "thinik": "think", "tobasco": "tabasco", "togeather": "together",
    "tounge": "tongue", "triveal": "trivial", "tromebone": "trombone", "trol": "troll",
    "underware": "underwear", "vacuumming": "vacuuming", "vetetables": "vegetables",
    "villian": "villain", "virgina": "virginia", "waiste": "waist",
    "wallice": "wallace", "wartersking": "waterskiing", "washinton": "washington",
    "werinkles": "wrinkles", "wimpledon": "wimbledon", "windsheild": "windshield",
    "woud": "would", "yatzee": "yahtzee", "yeild": "yield", "fetting": "getting",
    "irdle": "girdle", "pader": "pager", "birt": "bird", "bumber": "bumper",
    "apls": "alps", "pocomo": "pocono", "hor": "hour", "oder": "order",
    # contractions missing their apostrophe
    "dont": "don't", "doesnt": "doesn't", "didnt": "didn't", "isnt": "isn't", "wasnt": "wasn't",
    "wouldnt": "wouldn't", "couldnt": "couldn't", "shouldnt": "shouldn't", "arent": "aren't",
    "werent": "weren't", "havent": "haven't", "hasnt": "hasn't", "youre": "you're",
    "youd": "you'd", "youll": "you'll", "youve": "you've", "theyre": "they're",
    "whats": "what's", "thats": "that's", "im": "I'm",
}

# Whole-prompt corrections (matched after cleaning), for truncated prompts.
PROMPT_FIXES = {
    "Ame A Reason Why You Might Be Nervous While Driving.": "Name A Reason Why You Might Be Nervous While Driving.",
}

# Substring fixes applied case-insensitively after SPELLING (typos that are
# real words, run-together words, and show-board truncations).
PHRASES = {
    "Santa Clause": "Santa Claus", "Mrs. Clause": "Mrs. Claus", "Shit/Sweater": "Shirt/Sweater",
    "Fired Chicken": "Fried Chicken", "Shuttering": "Stuttering", "Lot's Of Kids": "Lots Of Kids",
    "At The Alter": "At The Altar", "Bad Wrap": "Bad Rap", "Then The West": "Than The West",
    "Post People List In Their Personal's Ads": "Most People List In Their Personal Ads",
    "Would't": "Wouldn't", "Advised To To Do": "Advised To Do", "In-Law_": "In-Law",
    "Father-In_Law": "Father-In-Law", "JulietteJuliet": "Juliet",
    "Celebs/ScandlesCelebs/Scandals": "Celebs/Scandals", "WomenWhich": "Women: Which",
    "WhoAre You": "Who Are You", "Movie Thearre": "Movie Theatre",
    "Empire State Bldg.": "Empire State Building", "Golden Gate Brdg.": "Golden Gate Bridge",
    "Check Driv. Lic.": "Check Driver's License", "Under Bed/Mattr.": "Under Bed/Mattress",
    "Unpaid Elec. Bill": "Unpaid Electric Bill", "Divorce/Separ.": "Divorce/Separation",
    "Exer./Lose Weight": "Exercise/Lose Weight", "Matthew Mcconaug.": "Matthew McConaughey",
    "Chicken/Buf. Wing": "Chicken/Buffalo Wing", "Market/Conv Store": "Market/Convenience Store",
    "Construct. Worker": "Construction Worker", "Maka A Will": "Make A Will",
    "Acty Flirty": "Act Flirty", "Fas GPS": "Has GPS", "What Dhe Looks": "What She Looks",
    "Mis Pronunciation": "Mispronunciation", "Hair For Fur": "Hair Or Fur",
    "Anette Funicello": "Annette Funicello", "Streets Of Sf": "Streets Of San Francisco",
}

# Forced casing for words (added on top of what is learned from the old CSVs).
CASING = [
    "TV", "TVs", "DVD", "DVDs", "CD", "CDs", "VCR", "ATM", "BBQ", "GPS", "IRS", "DMV", "FBI", "CIA",
    "DEA", "NRA", "KKK", "USA", "UFO", "SUV", "DNA", "CEO", "CPR", "DJ", "MTV", "NFL",
    "NBA", "WNBA", "MADD", "WIC", "YMCA", "NYC", "RSVP", "BYOB", "EMT", "ICU", "IQ",
    "MP3", "PJs", "TP", "RV", "VW", "HBO", "CNN", "ESPN", "AAA", "PTA",
    "iPod", "iPods", "iPhone", "iPad", "Xbox", "SpongeBob", "McDonald's", "LeBron",
    "AC", "WWE", "WWF", "MPH", "OJ", "AA", "IV", "USS", "HP", "GM",
]

# Learned special casings to ignore.
NOT_SPECIAL = []

# prompt_key() values of questions removed by the content filter (or broken).
# Audience is adults at a living-room party: mild innuendo stays; explicit,
# hateful or mean-spirited prompts go.
REMOVE_PROMPT_KEYS = {
    "namesomeoneyoutalkoveryoursexlifewith",                       # explicit
    "whichpresidentsdaughterdoyouthinkappearednudeinplayboy",      # sexualizes real people
    "namesomethinginterviewersalwaysaskparishiltonabout",          # "her sex video"
    "nameagroupwiththreeinitialsthatscareyou",                     # KKK as top answer
    "inwhatroomofthehouseisamanmostlikelytocommitmurder",          # domestic violence
    "namesomethingfromyourbathroomthatyoumightbringonacampingtrip",  # broken: one answer split 4 ways
    "moviestudio",                                                  # broken: prompt truncated upstream
}

# Regex fragments used only to build review lists (--report); nothing is auto-removed.
REVIEW_KEYWORDS = [
    r"sex\w*", r"naked", r"nude\w*", r"nudi\w*", r"penis", r"vagina", r"breasts?", r"boobs?", r"boobies",
    r"condoms?", r"orgasm\w*", r"porn\w*", r"strip\w*", r"viagra", r"erect\w*", r"horny", r"kinky",
    r"make ?out", r"making out", r"foreplay", r"intercourse", r"lingerie", r"thong", r"panties", r"bra",
    r"butt", r"ass", r"asses", r"booty", r"behind", r"crotch", r"groin", r"privates", r"private parts",
    r"genital\w*", r"testicles?", r"balls", r"nipples?", r"bedroom", r"in bed", r"mood", r"affair\w*",
    r"mistress\w*", r"cheat\w*", r"hooker\w*", r"prostitut\w*", r"pimp", r"stripper\w*", r"escort",
    r"one night stand", r"virgin\w*", r"seduc\w*", r"lust\w*", r"aroused?", r"arousal", r"turn(s|ed)? on",
    r"undress\w*", r"skinny dip\w*", r"shit\w*", r"fuck\w*", r"damn", r"bitch\w*", r"whore\w*", r"slut\w*",
    r"piss\w*", r"crap", r"hell", r"dick\w*", r"cock\w*", r"pussy", r"sucks?", r"blow ?job", r"lap dance",
    r"kill\w*", r"murder\w*", r"suicide", r"rape\w*", r"molest\w*", r"abus\w*", r"gun\w*", r"shoot\w*",
    r"drugs?", r"cocaine", r"heroin", r"meth", r"marijuana", r"weed", r"pot", r"high", r"stoned",
    r"drunk\w*", r"hangover", r"vomit\w*", r"puke\w*", r"diarrhea", r"poop\w*", r"fart\w*", r"gas",
    r"gay", r"lesbian\w*", r"homo\w*", r"queer", r"fag\w*", r"retard\w*", r"midget\w*", r"ghetto",
    r"black people", r"white people", r"mexican\w*", r"asian\w*", r"chinese", r"jew\w*", r"muslim\w*",
    r"arab\w*", r"indian\w*", r"eskimo\w*", r"gypsy", r"oriental", r"race", r"racis\w*", r"fat", r"ugly",
    r"hitler", r"nazi\w*", r"terroris\w*", r"bomb\w*", r"9/11", r"slave\w*", r"kkk", r"nra",
    r"wife beat\w*", r"hit (his|her|their|your) (wife|husband|kids?)", r"spank\w*", r"beat\w*",
    r"naughty", r"sexy", r"hot(tie)?", r"flirt\w*", r"hickey", r"lover\w*", r"nudist", r"playboy",
    r"hustler", r"bikini", r"speedo", r"underwear", r"undies", r"nudies", r"boxers", r"briefs",
]

DATED_KEYWORDS = [
    r"vcrs?", r"video ?tapes?", r"vhs", r"beeper", r"pager", r"walkman", r"cassettes?", r"fax\w*",
    r"floppy", r"blockbuster", r"myspace", r"aol", r"dial[- ]?up", r"payphone", r"pay phone",
    r"phone ?book", r"yellow pages", r"answering machine", r"tivo", r"ipod\w*", r"blackberry",
    r"palm pilot", r"dvds?", r"typewriter", r"film", r"polaroid", r"rolodex",
    r"sears tower", r"blockbuster", r"circuit city", r"k-?mart",
    r"oprah", r"letterman", r"leno", r"rosie", r"springer", r"montel", r"sally jessy", r"geraldo",
    r"regis", r"philbin", r"kathie lee", r"ally mcbeal", r"seinfeld", r"friends", r"frasier",
    r"britney", r"spears", r"backstreet", r"n ?sync", r"spice girls", r"paris hilton", r"nicole richie",
    r"osbournes?", r"anna nicole", r"jessica simpson", r"lindsay lohan", r"k-?fed", r"federline",
    r"bush", r"clinton", r"monica", r"lewinsky", r"gore", r"cheney", r"o\.?j\.?", r"simpson",
    r"tiger woods", r"shaq\w*", r"jordan", r"tom cruise", r"brangelina", r"bennifer", r"american idol",
    r"clay aiken", r"ruben studdard", r"studdard", r"barrino", r"kelly clarkson", r"simon cowell",
    r"survivor", r"the apprentice", r"trump", r"arnold", r"schwarzenegger", r"y2k", r"atkins",
]
