from app.core.rate_limit import RateLimiter


def test_memory_limiter_blocks_after_limit():
    limiter = RateLimiter(redis_url="")  # in-memory mode
    key = "rl:test:abc"
    assert all(limiter.allow(key, limit=3, window_seconds=60) for _ in range(3))
    assert not limiter.allow(key, limit=3, window_seconds=60)


def test_memory_limiter_isolates_keys():
    limiter = RateLimiter(redis_url="")
    assert limiter.allow("rl:a", 1, 60)
    assert not limiter.allow("rl:a", 1, 60)
    assert limiter.allow("rl:b", 1, 60)
