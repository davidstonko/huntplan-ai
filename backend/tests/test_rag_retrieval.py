"""Retrieval helpers for the AI planner.

These are pure functions, so they run without a database. They exist because
the retrieval layer failed twice in one session, both times silently:

1. plainto_tsquery ANDs every lexeme, so "Can I hunt deer with a bow in
   Frederick County today?" demanded deer AND bow AND frederick AND today in a
   single chunk. Nothing matched, so it fell through to an ILIKE scan that had
   no ORDER BY, and the planner answered a deer question with squirrel and
   grouse seasons.
2. Even once ranked, no chunk stating a deer SEASON reached the model, so it
   truthfully replied that it had no deer season information — a useless
   answer to the question this app exists to answer.

The fix was an OR tier plus species coverage. These tests pin the pieces that
can be checked without Postgres.
"""

from app.modules.ai_planner.service import _query_terms, _species_in_query


class TestQueryTerms:
    def test_drops_question_scaffolding(self):
        terms = _query_terms("Can I hunt deer with a bow in Frederick County today?")
        assert "deer" in terms
        assert "bow" in terms
        assert "frederick" in terms
        # These carry no signal and would otherwise dominate the ranking.
        for noise in ("can", "with", "in", "today"):
            assert noise not in terms

    def test_strips_tsquery_operators(self):
        # A stray & or ! would be parsed as tsquery syntax, not searched for,
        # and an unbalanced one raises a SyntaxError inside Postgres.
        terms = _query_terms("deer & bow | turkey ! (season):A")
        assert terms == ["deer", "bow", "turkey", "season"]

    def test_deduplicates_preserving_order(self):
        assert _query_terms("deer deer bow deer") == ["deer", "bow"]

    def test_drops_single_characters(self):
        assert "a" not in _query_terms("a deer")

    def test_empty_when_only_noise(self):
        # Must return empty rather than build "| |", which Postgres rejects.
        assert _query_terms("can I do this today?") == []

    def test_handles_punctuation_only(self):
        assert _query_terms("???") == []


class TestSpeciesDetection:
    def test_plain_species(self):
        assert _species_in_query("when does deer season open") == "White-tailed Deer"

    def test_hunter_vocabulary_maps_to_the_stored_species(self):
        assert _species_in_query("how many antlerless can I take") == "White-tailed Deer"
        assert _species_in_query("is it legal to shoot a gobbler") == "Wild Turkey"
        assert _species_in_query("cottontail limits") == "Rabbit"

    def test_longest_alias_wins(self):
        # "black bear" must not be shortened to "bear" by an earlier match,
        # and "white-tailed deer" must not match on "deer" alone.
        assert _species_in_query("black bear permit") == "Black Bear"
        assert _species_in_query("white-tailed deer archery") == "White-tailed Deer"

    def test_waterfowl_aliases_collapse(self):
        for q in ("goose limit", "geese limit", "duck season", "teal season"):
            assert _species_in_query(q) == "Waterfowl"

    def test_word_boundaries(self):
        # "doe" must not fire on "does", and no species should be found here.
        assert _species_in_query("what does the law say") is None

    def test_no_species(self):
        assert _species_in_query("do I need blaze orange") is None
        assert _species_in_query("is Sunday hunting allowed in Garrett County") is None
