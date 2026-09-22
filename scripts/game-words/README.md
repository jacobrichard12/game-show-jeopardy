# game-words import

Fills the `act` (Act / Draw / Describe) and `charades` (Reverse Charades) banks
in `src/data/partyGames.json` from
[nick-aschenbach/game-words](https://github.com/nick-aschenbach/game-words)
(MIT; copyright and license notice in `src/data/THIRD_PARTY_NOTICES.md`, which
must stay with the data).

```sh
git clone --depth 1 https://github.com/nick-aschenbach/game-words.git /tmp/game-words
node scripts/game-words/import.js /tmp/game-words/assets/game_words/game_words.yaml
```

No dependencies. Re-running gives the same file: hand-written entries (and the
other party games) are kept, and entries a previous run produced are replaced.
Curation lives in the lists at the top of `import.js`; edit them and re-run.

**Act / Draw / Describe:** charades words → `act`, pictionary words → `draw`
(a few verb-like pictionary words → `act`). Difficulty follows the source:
easy → easy, medium → medium, difficult/hard → hard; the charades "actions"
phrases are easy and the pictionary idioms are hard. The source has no
off-limits lists, so all `describe` entries are hand-written.

**Reverse Charades:** themed lists of ~15 words (Halloween, Christmas,
Thanksgiving, Fourth of July, New Year's, Valentine's Day, Springtime, Animals,
Food & Kitchen, Around the House, Travel & Vacation, Famous Places,
Activities, Sayings). Holiday lists are easy; Travel, Places and Activities are
medium; Sayings are hard; Animals, Food and House are split by each word's
difficulty in the source's graded lists (default medium).

**Not imported:** the source's people, characters, movie and song lists;
brand names; film/TV/music references; offensive or violent words; abstract
or obscure words; and the catchphrase easy/medium/hard lists (describing
words that need off-limits lists this source doesn't have).
