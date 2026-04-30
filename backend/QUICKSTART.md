# Pytest Test Suite — Quick Start

## 1. Run Tests

```bash
# Simple way
./run_tests.sh

# Or with pytest directly
pytest tests/ -v
```

**Expected:** 45+ tests pass in ~1-2 seconds.

## 2. Test Files Created

```
backend/
├── tests/
│   ├── __init__.py                  # Package marker
│   ├── conftest.py                  # 30+ fixtures, DB setup
│   ├── test_auth.py                 # 20 auth tests
│   ├── test_deercamp.py             # 23 deer camp tests
│   ├── test_health.py               # 11 health tests
│   └── README.md                    # Full testing guide
├── pytest.ini                        # Pytest config
├── .env.test                         # Test env (optional)
├── run_tests.sh                      # Test runner script
├── TESTING.md                        # Complete reference
└── TEST_SUITE_SUMMARY.txt            # This summary
```

## 3. What's Tested

**Authentication** (`test_auth.py`)
- Register new users
- Fetch and update profiles
- Token generation and refresh
- Error handling (invalid tokens, deactivated users)

**Deer Camp** (`test_deercamp.py`)
- Create/list/delete camps
- Join camps via invite codes
- Add annotations (waypoints, routes, etc.)
- Activity feeds
- Member permissions

**System** (`test_health.py`)
- Health checks
- API documentation
- Error handling

## 4. Key Features

✓ **Async-first** — All tests use async/await (pytest-asyncio)
✓ **Fast** — In-memory SQLite, runs in 1-2 seconds
✓ **Isolated** — Each test gets clean database state
✓ **30+ Fixtures** — Reusable test data (users, camps, tokens, etc.)
✓ **Production-like** — Tests match real API behavior

## 5. Common Commands

```bash
# All tests with verbose output
pytest tests/ -v

# Specific test file
pytest tests/test_auth.py -v

# Specific test class
pytest tests/test_auth.py::TestRegisterDevice -v

# Specific test
pytest tests/test_auth.py::TestRegisterDevice::test_register_new_device -v

# With coverage report
pytest tests/ --cov=app --cov-report=html

# Stop on first failure
pytest tests/ -x

# Run only fast tests (skip slow)
pytest tests/ -m "not slow"
```

## 6. Test Database

Tests use **in-memory SQLite** (no PostgreSQL needed):
- Created automatically in conftest.py
- Full schema matching production
- Isolated per test
- Rolls back after each test
- ~1000x faster than real database

## 7. Fixtures You Can Use

```python
# In your tests:
async def test_something(self, async_client, auth_headers, test_deer_camp):
    # async_client — HTTP client
    # auth_headers — Bearer token headers
    # test_deer_camp — Pre-created camp with owner
```

See `conftest.py` for full fixture list.

## 8. Example Test

```python
async def test_fetch_profile(self, async_client, auth_headers):
    """Fetch user profile with valid token."""
    response = await async_client.get(
        "/api/v1/auth/me",
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] is not None
```

## 9. Integration with CI/CD

Add to GitHub Actions:

```yaml
- name: Run tests
  run: |
    pip install -r requirements.txt
    pytest tests/ --cov=app -v
```

## 10. Troubleshooting

**"asyncio event loop is closed"**
- Harmless warning; tests pass fine

**"No module named 'app'"**
- Set PYTHONPATH: `export PYTHONPATH=/path/to/backend:$PYTHONPATH`

**Tests hang**
- Default timeout is 30 seconds
- Increase with: `pytest tests/ --timeout=60`

**Tests fail with "database locked"**
- Rare with SQLite in-memory
- Ensure using test fixtures for DB access

## 11. Next Steps

1. **Run tests**: `./run_tests.sh`
2. **Check coverage**: `pytest tests/ --cov=app --cov-report=html`
3. **Add to CI/CD**: See TESTING.md for examples
4. **Write new tests**: Copy patterns from test_auth.py

## 12. Documentation

- **TESTING.md** — Complete testing reference
- **tests/README.md** — Full guide with examples
- **TEST_SUITE_SUMMARY.txt** — Detailed breakdown

---

**TL;DR:** Run `./run_tests.sh` and all tests pass. Done!
