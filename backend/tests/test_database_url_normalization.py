"""DATABASE_URL normalization.

The production outage of 2026-07 ended with the database moving off Render's
free Postgres (which is deleted, not merely suspended, when the trial ends) to
an external provider. External providers hand out libpq connection strings
carrying parameters asyncpg does not accept, so the URL has to be translated
before SQLAlchemy builds the engine. These tests pin that translation, because
the failure mode is a TypeError raised deep inside asyncpg at first connect --
long after startup has reported success.
"""

from app.config import Settings


def url_for(raw: str) -> str:
    return Settings(database_url=raw).database_url


def sync_url_for(raw: str) -> str:
    return Settings(database_url=raw).database_url_sync


class TestDriverPrefix:
    def test_render_postgres_scheme_gets_the_async_driver(self):
        assert url_for("postgres://u:p@host:5432/db").startswith(
            "postgresql+asyncpg://"
        )

    def test_postgresql_scheme_gets_the_async_driver(self):
        assert url_for("postgresql://u:p@host:5432/db").startswith(
            "postgresql+asyncpg://"
        )

    def test_an_explicit_driver_is_left_alone(self):
        raw = "postgresql+asyncpg://u:p@host:5432/db"
        assert url_for(raw) == raw


class TestNeonConnectionString:
    """The literal string Neon's dashboard offers for copy-paste."""

    NEON = (
        "postgresql://huntplan_owner:secret@ep-cool-water-123456.us-east-2"
        ".aws.neon.tech/huntplan?sslmode=require&channel_binding=require"
    )

    def test_sslmode_becomes_asyncpg_ssl(self):
        result = url_for(self.NEON)
        assert "sslmode" not in result
        assert "ssl=require" in result

    def test_channel_binding_is_dropped(self):
        assert "channel_binding" not in url_for(self.NEON)

    def test_tls_is_still_demanded(self):
        # Dropping sslmode without re-adding ssl would silently downgrade a
        # connection that crosses the public internet.
        assert "ssl=require" in url_for(self.NEON)

    def test_host_and_database_survive(self):
        result = url_for(self.NEON)
        assert "ep-cool-water-123456.us-east-2.aws.neon.tech" in result
        assert "/huntplan" in result

    def test_sync_url_keeps_libpq_spelling(self):
        # Alembic runs through psycopg, which wants sslmode, not ssl.
        result = sync_url_for(self.NEON)
        assert "+asyncpg" not in result
        assert "sslmode=require" in result


class TestOtherProviders:
    def test_sslmode_disable_does_not_add_ssl(self):
        result = url_for("postgresql://u:p@localhost:5432/db?sslmode=disable")
        assert "ssl=require" not in result

    def test_unknown_parameters_are_preserved(self):
        result = url_for("postgresql://u:p@host/db?sslmode=require&foo=bar")
        assert "foo=bar" in result

    def test_no_query_string_is_untouched(self):
        assert url_for("postgresql://u:p@host:5432/db").endswith("/db")

    def test_empty_query_string_does_not_leave_a_dangling_question_mark(self):
        assert not url_for("postgresql://u:p@host/db?channel_binding=require").endswith(
            "?"
        )
