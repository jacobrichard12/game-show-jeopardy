#!/usr/bin/env node
// Imports curated words from nick-aschenbach/game-words (MIT, see
// src/data/THIRD_PARTY_NOTICES.md) into src/data/partyGames.json:
//   - "act"      (Act / Draw / Describe): charades words -> act, pictionary words -> draw
//   - "charades" (Reverse Charades): themed lists of ~15 words
// Only the "act" and "charades" keys change; the other games are re-serialized
// as they are. Hand-written entries are kept: on a re-run, entries identical to
// what this script generates are replaced, everything else stays.
//
// Usage: node scripts/game-words/import.js path/to/game_words.yaml
// See scripts/game-words/README.md.

const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "../../src/data/partyGames.json");
const LIST_SIZE = 15; // target words per Reverse Charades list
const MIN_LIST = 10; // slots.test.ts requires >= 10 words per list
const DIFFS = ["easy", "medium", "hard"];

// ---------------------------------------------------------------- parse
// The source file is a two-level YAML map of string lists; this tiny parser
// handles exactly that shape (no YAML dependency needed).
function parseGameWords(file) {
  const data = {};
  let game;
  let cat;
  fs.readFileSync(file, "utf8")
    .split("\n")
    .forEach((line) => {
      let m;
      if ((m = line.match(/^(\w+):\s*$/))) data[(game = m[1])] = {};
      else if ((m = line.match(/^ {2}(\w+):\s*$/))) data[game][(cat = m[1])] = [];
      else if ((m = line.match(/^ {2}- (.*)$/))) data[game][cat].push(unquote(m[1].trim()));
    });
  return data;
}

function unquote(s) {
  const m = s.match(/^(["'])(.*)\1$/);
  return m ? m[2] : s;
}

// ---------------------------------------------------------------- curation
const key = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, "");
// For duplicate checks: also treats simple plurals as the same word.
const dupKey = (w) => key(w).replace(/s$/, "");
const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);
const keySet = (list) => new Set(list.map(key));

// Spelling fixes in the source.
const FIXES = {
  "State of Liberty": "Statue of Liberty",
  "Canadian goose": "Canada goose",
  "fireman pole": "fire pole",
  lawnmower: "lawn mower",
  'Say "cheese"': "Say cheese",
};

// Dropped from both games.
const BLOCK = keySet([
  // real or fictional people, film / TV / song references
  "Spider Man", "Harry Potter", "Michael Jackson", "Rocky", "Superman", "Michael Jordan", "Babe Ruth",
  "Sherlock Holmes", "Elvis Presley", "Pinocchio", "Spock", "Beethoven", "Will Smith", "Mickey Mouse",
  "Frankenstein", "Igor", "Ghostbusters", "Monster Mash", "lightsaber", "twitterpated", "the Grinch",
  "Rudolph the Red-Nosed Reindeer", "Little Saint Nick", "Buddy the Elf", "the Little Drummer Boy",
  "Frosty the Snowman", "the Nutcracker", "Jack Frost", "Father Time", "Squanto", "Macy's Day Parade",
  "Universal Studios", "Six Flags", "Broadway", "scary movies", "movies", "reggae", "jammin'",
  "ebony and ivory", "Auld Lang Syne",
  // brands / products
  "Heinz 57", "Chick-fil-A", "Windex", "Old Spice", "iPod", "iPad", "Zamboni", "Burger King", "KFC",
  "Taco Bell", "McDonalds", "spam", "Twinkies", "Kool-aid", "Pop Tart", "jell-o", "CD", "DVDs",
  // offensive / violent / insensitive
  "gypsy", "sin", "crime", "bomb", "gang", "battle", "highjack", "deployed", "whiplash", "shock collar",
  "purge", "doom", "blind", "mute", "wheelchair", "Native American", "macho", "gas", "kick the bucket",
  "cast pearls before swine", "better the devil you know", "like shooting fish in a barrel",
  "rub salt in an open wound",
  // obscure or awkward idioms
  "someone with a hollow leg", "fish or cut bait", "cut the rug", "pass the buck", "everybody and their dog",
  "rise above the blues", "get your feathers in a bunch", "take a leaf out of his book", "ballpark figure",
  "push the envelope", "peanut gallery", "close, but no cigar", "at the bottom of the totem pole",
  "fraidey cat", "the cat's meow", "the bee's knees", "burning bridges", "at arm's length",
  "more than you can shake a stick at", "dog and pony show", "fence-sitter", "put it on the back burner",
  "throw a wrench in the works", "stiff upper lip", "chip on your shoulder", "good fences make good neighbors",
  "make a beeline for", "comparing apples and oranges", "set in stone", "money burns a hole in your pocket",
  "a bird in the hand is worth two in the bush", "bull in a china closet", "stop cold turkey",
  "out of my hair", "big fish in a small pond", "bright as a button", "carry a tune", "one foot in the door",
  "give my two cents", "a fifth wheel", "go out on a limb", "go the extra mile", "reinvent the wheel",
  "up a creek without a paddle", "where there's smoke, there's fire", "straw that broke the camel's back",
  "cross the bridge when we come to it", "shoot the breeze", "bite the dust", "hold down the fort",
  "the lion's share", "wet blanket", "in a jam", "pull someone's leg", "have a cow", "one smart cookie",
  "smarty pants", "busy bee", "why the long face?", "on the same page", "chip off the old block",
  "wallflower", "baker's dozen", "you're toast", "like a deer in the headlights",
  // near-duplicates of hand-written phrases
  "cry over spilt milk", "feeling under the weather", "get cold feet",
]);

// Words that make weak "act" prompts (trivial to point at, or not actable).
// They can still be drawn.
const NOT_ACTABLE = keySet([
  "lip", "cheek", "chin", "hair", "feet", "eye", "ear", "mouth", "knee", "toe", "nose", "head", "elbow",
  "tongue", "back", "hand", "arm", "wrist", "finger", "shoulder", "waist", "rib", "chest", "skin", "hip",
  "heel", "forehead", "teeth", "stomach", "lung", "spine", "skull", "brain", "dimple", "fist",
  "salt", "circle", "point", "old", "full", "deep", "funny", "smell", "hurt", "sand", "floor", "president",
  "match", "hill", "mail", "cast", "cup", "pet", "hook", "gum", "picture", "toy", "story", "stain", "cuff",
  "bun", "sheet", "wax", "stiff", "song", "wing", "tusk", "fang", "paw", "claw", "fin", "big",
]);

// Pictionary words that can't really be drawn.
const NOT_DRAWABLE = keySet([
  "important", "retail", "drawback", "pro", "season", "myth", "double", "lie", "comfy", "logo", "bargain",
  "darkness", "catalog", "newsletter", "commercial", "download", "vitamin", "hydrogen", "punk", "brand",
  "runt", "dorsal", "rubber", "handle", "migrate", "think", "trip", "song", "half", "outside", "round",
  "shallow", "state", "spare", "base", "password", "nature", "food", "electricity", "America", "address",
  "room", "corner", "deep", "full", "point", "snag", "clog", "lap", "diagonal", "chime", "yolk", "fabric",
  "neighborhood", "grandpa", "husband", "peasant", "crust", "rim", "wax", "season", "back", "family",
  "important", "professor", "pharmacist", "world", "exercise", "sleep", "dream", "fizz", "pocket", "leak",
]);

// Pictionary words that act out better than they draw.
const PREFER_ACT = keySet([
  "kneel", "dance", "scream", "sneeze", "juggle", "tiptoe", "wobble", "honk", "applause", "mime",
  "hurdle", "hug", "wag", "cheerleader", "golf", "tennis", "hockey", "roller blading", "ski", "skate",
  "hopscotch", "yo-yo", "hula hoop", "pogo stick", "dizzy", "drip", "dripping", "thief",
]);

// Charades "hard" words that are genuinely actable (the rest are abstract).
const CHARADES_HARD_KEEP = keySet([
  "negotiate", "silhouette", "weed killer", "dismantle", "applesauce", "mascot", "alphabetize",
  "sandbox", "journal", "mine shaft", "procrastinate", "organize", "shrink ray", "standing ovation",
  "unemployed", "explore", "flag", "beanstalk", "a cappella", "satellite", "shipwreck", "conversation",
  "teenager", "college", "aisle", "jet lag", "roundabout", "pendulum", "advertise", "baby monitor",
  "invitation", "personal bubble", "déjà vu",
]);

// Landmarks and well-known places for a "Famous Places" charades list.
const FAMOUS_PLACES = keySet([
  "Statue of Liberty", "the Grand Canyon", "the Sphinx", "the Taj Mahal", "Egyptian Pyramids",
  "Buckingham Palace", "the White House", "Great Wall of China", "the Eiffel Tower", "Easter Island",
  "Niagara Falls", "the Coliseum", "London Bridge", "Mount Rushmore", "Yellowstone", "Stonehenge",
  "Antarctica", "Las Vegas", "the Golden Gate Bridge", "Mount Everest", "the Great Barrier Reef",
  "Empire State Building", "Big Ben", "the Amazon Rainforest", "Venice", "Hawaii", "Times Square",
  "the North Pole", "Disneyland", "the Liberty Bell", "Hong Kong", "Paris", "Tokyo",
]);

// Reverse Charades: per list, words that don't fit its theme or are too
// vague to act out as part of it.
const OFF_THEME = {
  Animals: keySet([
    "human", "flock", "herd", "hive", "school of fish", "jackalope", "rolly polly", "bush baby", "gnu",
    "housecat", "doe", "ewe", "cub", "joey", "calf", "hen", "chick", "duckling", "lamb", "kitten", "puppy",
    "bunny", "mink", "shrew", "lark", "finch", "partridge", "mallard", "flounder", "bass", "dinosaur",
  ]),
  "Food & Kitchen": keySet([
    "broil", "dredge", "blanch", "poach", "zest", "simmer", "freeze", "melt", "flambé", "marinade",
    "deep-fry", "produce", "dairy", "poultry", "meat", "low-fat", "soup de jour", "la carte", "à la carte",
    "sifter", "Bundt pan", "lemon zester", "egg timer", "muffin tin", "Dutch oven", "colander", "broth",
    "Bavarian cream", "baked Alaska", "snickerdoodle", "kumquat", "okra", "parsnip", "leek", "barley",
    "grits", "venison", "vanilla extract", "almond extract", "soybean", "gourd", "breakfast", "rolls",
    "date", "sea salt", "bran muffins", "potatoes au gratin", "chow mien", "cornmeal", "turnip",
  ]),
  "Around the House": keySet([
    "brother", "mess", "meal", "dinner", "bedtime", "hot water", "Sunday shoes", "home movies", "books",
    "crayons", "stamps", "boots", "shoes", "door knob", "flowers", "baby-sitter", "Internet", "leak",
    "wick", "sash", "block", "cash", "loose change", "lace", "mold", "crumb", "bedbug", "weed",
    "scuff mark", "dust bunny", "stationery", "baseboards", "yardstick", "glass", "garbage", "homework",
    "picture", "snowman", "ice", "wheel", "pocket", "quarter", "snack", "ink", "plastic", "chest", "ceiling",
    "handle", "floor", "stain", "mail",
  ]),
  "Travel & Vacation": keySet([
    "condo", "July", "June", "summer", "customs", "layover", "time off", "vacation day", "scenery",
    "sunny weather", "candy", "trains", "holiday", "party", "money belt", "sunshine", "relax", "stroll",
    "first class", "airline", "family reunion", "island", "lake", "river", "camera", "map", "hotel",
    "bicycle", "airplane", "tourist", "shopping", "sunset",
  ]),
  Halloween: keySet([
    "horror", "eerie", "spells", "spooks", "afraid", "frightened", "scary", "creepy", "spooky", "dark",
    "nighttime", "sweets", "chocolate", "autumn", "fall", "black", "orange", "secret lab", "chains",
    "going trick-or-treating", "fortune teller", "crypt", "ghoul", "lollipop", "marshmallow", "doorbell",
  ]),
  Christmas: keySet([
    "Christmas break", "Christmas spirit", "wassail", "soup", "turkey", "stable", "shepherds", "gifts",
    "toys", "doll", "scarf", "cinnamon", "pumpkin pie", "decorations", "lights", "bells", "star",
  ]),
  "Fourth of July": keySet([
    "national holiday", "sports", "red", "white", "blue", "Georgia", "Common Sense", "independence",
    "republicanism", "taxes", "fair", "games", "justice", "states", "the Constitution", "Boston", "parks",
    "South Carolina", "England", "music", "family reunions", "streamers", "patriotism", "inalienable rights",
    "Patrick Henry", "minutemen", "Maryland", "James Madison", "congress", "united", "New Hampshire",
    "Thomas Jefferson", "Thomas Paine", "speeches", "thirteen colonies", "liberty and justice for all",
    "Massachusetts", "democracy", "Alexander Hamilton", "founding fathers", "Rhode Island",
    "North Carolina", "Treaty of Paris", "pride", "fun", "George Washington", "celebration", "Delaware",
    "life, liberty, and the pursuit of happiness", "band", "shows", "New York", "John Hancock", "Virginia",
    "anthem", "colonies", "Betsy Ross", "Francis Scott Key", "patriot", "Pennsylvania", "concerts", "pie",
    "family", "1776", "travel", "Connecticut", "John Adams", "Benjamin Franklin", "liberty", "stripes",
    "stars", "soda", "American Revolution", "Revolutionary War", "America", "freedom", "This Land is Your Land",
    "God Bless America", "Yankee Doodle", "My Country 'Tis of Thee", "America the Beautiful",
    "God Bless the U.S.A.", "You're a Grand Old Flag", "Star Spangled Banner", "candy", "ice cream",
    "hamburgers", "hot dogs", "watermelon", "potato salad", "coleslaw", "corn on the cob", "s'mores",
    "baseball", "balloons", "summer", "July", "party", "New Jersey",
  ]),
  Thanksgiving: keySet([
    "charity", "food drives", "candlesticks", "New England", "winter squash", "thanks", "Plymouth",
    "Thursday", "dumplings", "resting", "rejoice", "festival", "praise", "survive the winter", "blessings",
    "table setting", "sweet corn", "gratitude", "thankful", "grateful", "Turkey Bowl", "yams",
    "football games", "parades", "creamed corn", "squash", "rolls", "venison", "holiday", "travel", "pie",
    "celebration", "family", "watching TV",
  ]),
  "New Year's": keySet([
    "wishes", "television", "bank holiday", "food", "parties", "good luck", "twelve chimes", "traditions",
    "January", "December", "2013", "speech", "dance/dancing", "feast", "gifts", "music", "clock", "concerts",
  ]),
  "Valentine's Day": keySet([
    "cool", "email me", "you rule", "neat", "my pal", "be good", "so fine", "how sweet", "too sweet",
    "for you", "real love", "my guy", "my girl", "my doll", "my baby", "my love", "hi love", "dear",
    "it's love", "love me", "miss me", "be true", "friendship", "couples", "snow", "restaurant", "mailbox",
    "dinner", "Saint Valentine", "February", "pink", "Romeo", "my Juliet", "my Romeo", "my hero", "hello",
    "angel", "I heart you", "you + me", "only you", "miss you", "lace", "red", "happy", "dove",
  ]),
  Springtime: keySet([
    "April", "trees", "seeds", "pollen", "sun", "bird", "green", "worms", "ants", "wildflowers",
    "blossoms", "flower", "dew", "park", "garden", "mud",
  ]),
};

// Drops blocked and garbled (bad encoding) entries; fixes spellings.
function clean(words, extraBlock) {
  return words
    .map((w) => FIXES[w] || w)
    .filter((w) => w && !/\\x|[\x80-\x9f]/.test(w) && !BLOCK.has(key(w)) && !(extraBlock && extraBlock.has(key(w))));
}

// ---------------------------------------------------------------- build
function build(src) {
  const pic = src.pictionary;
  const cha = src.charades;
  const hol = src.holidays;
  const cp = src.catchphrase;

  // A word's difficulty from the source's own graded lists (easiest wins).
  const graded = {};
  [
    ["easy", [cha.easy, pic.easy, cp.easy]],
    ["medium", [cha.medium, pic.medium, cp.medium]],
    ["hard", [cha.difficult, cha.hard, pic.difficult, pic.hard, cp.hard]],
  ].forEach(([diff, lists]) =>
    lists.forEach((list) =>
      list.forEach((w) => {
        if (!graded[key(w)]) graded[key(w)] = diff;
      })
    )
  );

  // --- Act / Draw / Describe. Earlier sources win when a word repeats.
  // (Game-words has no off-limits lists, so no new "describe" entries.)
  const act = { easy: [], medium: [], hard: [] };
  const actSources = [
    ["easy", "act", cha.actions],
    ["easy", "act", cha.easy],
    ["easy", "draw", pic.easy],
    ["medium", "act", cha.medium],
    ["medium", "draw", pic.medium],
    ["hard", "act", cha.difficult],
    ["hard", "act", cha.hard.filter((w) => CHARADES_HARD_KEEP.has(key(w)))],
    ["hard", "draw", pic.difficult],
    ["hard", "act", pic.idioms],
  ];
  actSources.forEach(([diff, mode, list]) =>
    clean(list).forEach((w) => {
      const m = mode === "draw" && PREFER_ACT.has(key(w)) ? "act" : mode;
      if (m === "act" && NOT_ACTABLE.has(key(w))) return;
      if (m === "draw" && NOT_DRAWABLE.has(key(w))) return;
      act[diff].push({ mode: m, word: cap(w) });
    })
  );

  // --- Reverse Charades: [category, words, difficulty]. A null difficulty
  // splits the list by each word's graded difficulty (default medium);
  // themed holiday lists stay whole.
  const travel = cp.travel.filter((w) => w === w.toLowerCase() || w === "Are we there yet?");
  const places = [...cp.travel, ...hol.independence, ...hol.newyears, ...hol.christmas].filter((w) =>
    FAMOUS_PLACES.has(key(FIXES[w] || w))
  );
  // Small themed lists go first so they keep their words when a word
  // appears in several source lists.
  const charadesSources = [
    ["Halloween", hol.halloween, "easy"],
    ["Christmas", hol.christmas, "easy"],
    ["Thanksgiving", hol.thanksgiving, "easy"],
    ["Fourth of July", hol.independence, "easy"],
    ["New Year's", hol.newyears, "easy"],
    ["Valentine's Day", [...hol.valentineword, ...hol.valentinesaying], "easy"],
    ["Springtime", hol.spring, "easy"],
    ["Animals", cp.animals, null],
    ["Food & Kitchen", cp.food, null],
    ["Around the House", cp.household, null],
    ["Travel & Vacation", travel, "medium"],
    ["Famous Places", places, "medium"],
    ["Activities", cha.actions, "medium"],
    ["Sayings", pic.idioms, "hard"],
  ];
  const charades = { easy: [], medium: [], hard: [] };
  const seen = new Set();
  charadesSources.forEach(([category, list, fixed]) => {
    const byDiff = { easy: [], medium: [], hard: [] };
    clean(list, OFF_THEME[category]).forEach((w) => {
      if (seen.has(dupKey(w))) return;
      seen.add(dupKey(w));
      byDiff[fixed || graded[key(w)] || "medium"].push(cap(w));
    });
    // A difficulty with too few words for its own list joins medium.
    ["easy", "hard"].forEach((d) => {
      if (byDiff[d].length < MIN_LIST) {
        byDiff.medium.push(...byDiff[d]);
        byDiff[d] = [];
      }
    });
    DIFFS.forEach((d) => {
      const words = byDiff[d];
      if (words.length < MIN_LIST) {
        if (words.length) console.warn(`skipped ${category} (${d}): only ${words.length} words`);
        return;
      }
      const chunks = Math.max(1, Math.round(words.length / LIST_SIZE));
      for (let i = 0; i < chunks; i++) {
        const from = Math.floor((i * words.length) / chunks);
        const to = Math.floor(((i + 1) * words.length) / chunks);
        charades[d].push({ category, words: words.slice(from, to) });
      }
    });
  });
  return { act, charades };
}

// ---------------------------------------------------------------- merge + write
// An entry a previous run produced: an exact generated entry, or (charades)
// a generated list with some words removed because they were already taken.
function fromImport(entry, generated) {
  return generated.some((g) =>
    g.words
      ? g.category === entry.category && entry.words.every((w) => g.words.includes(w))
      : g.mode === entry.mode && g.word === entry.word && !entry.taboo && !entry.seconds
  );
}

// Keeps existing (hand-written) entries, drops entries a previous run of this
// import generated, then appends the new import minus words already present.
function merge(existing, generated, wordsOf) {
  const allGenerated = DIFFS.flatMap((d) => generated[d]);
  const kept = {};
  DIFFS.forEach((d) => {
    kept[d] = (existing[d] || []).filter((e) => !fromImport(e, allGenerated));
  });
  const seen = new Set(DIFFS.flatMap((d) => kept[d].flatMap(wordsOf)).map(dupKey));
  const out = {};
  DIFFS.forEach((d) => {
    out[d] = [...kept[d]];
    generated[d].forEach((g) => {
      const fresh = wordsOf(g).filter((w) => !seen.has(dupKey(w)));
      fresh.forEach((w) => seen.add(dupKey(w)));
      if (g.words) {
        if (fresh.length >= MIN_LIST) out[d].push({ ...g, words: fresh });
      } else if (fresh.length) out[d].push(g);
    });
  });
  return out;
}

// Matches the file's hand formatting: one entry per line.
function serialize(data) {
  const val = (v) => (Array.isArray(v) ? `[${v.map((x) => JSON.stringify(x)).join(", ")}]` : JSON.stringify(v));
  const entry = (e) => `{ ${Object.keys(e).map((k) => `${JSON.stringify(k)}: ${val(e[k])}`).join(", ")} }`;
  const games = Object.keys(data).map((game) => {
    const diffs = Object.keys(data[game]).map(
      (d) => `    ${JSON.stringify(d)}: [\n${data[game][d].map((e) => `      ${entry(e)}`).join(",\n")}\n    ]`
    );
    return `  ${JSON.stringify(game)}: {\n${diffs.join(",\n")}\n  }`;
  });
  return `{\n${games.join(",\n")}\n}\n`;
}

function main() {
  const yamlPath = process.argv[2];
  if (!yamlPath) {
    console.error("usage: node scripts/game-words/import.js path/to/game_words.yaml");
    process.exit(1);
  }
  const generated = build(parseGameWords(yamlPath));
  const current = JSON.parse(fs.readFileSync(OUT, "utf8"));
  current.act = merge(current.act, generated.act, (e) => [e.word]);
  current.charades = merge(current.charades, generated.charades, (e) => e.words);
  fs.writeFileSync(OUT, serialize(current));

  DIFFS.forEach((d) => {
    const modes = {};
    current.act[d].forEach((e) => (modes[e.mode] = (modes[e.mode] || 0) + 1));
    const words = current.charades[d].reduce((n, e) => n + e.words.length, 0);
    console.log(
      `act ${d}: ${current.act[d].length} ${JSON.stringify(modes)} | charades ${d}: ${current.charades[d].length} lists, ${words} words`
    );
  });
}

main();
