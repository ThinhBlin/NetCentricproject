package services

import (
	"context"
	"sync"
	"time"
)

// RateLimiter lets Phase 2 swap in a Redis implementation.
type RateLimiter interface {
	// Allow records an attempt for key and reports whether it is permitted.
	Allow(key string) bool
}

type MemoryRateLimiter struct {
	mu     sync.Mutex
	hits   map[string][]time.Time
	max    int
	window time.Duration
}

// NewMemoryRateLimiter starts a pruning goroutine that exits when ctx is cancelled.
func NewMemoryRateLimiter(ctx context.Context, max int, window time.Duration) *MemoryRateLimiter {
	r := &MemoryRateLimiter{hits: map[string][]time.Time{}, max: max, window: window}
	go r.prune(ctx)
	return r
}

func (r *MemoryRateLimiter) Allow(key string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	now := time.Now()
	cutoff := now.Add(-r.window)
	kept := r.hits[key][:0]
	for _, t := range r.hits[key] {
		if t.After(cutoff) {
			kept = append(kept, t)
		}
	}
	// every attempt counts, even rejected-or-successful ones
	kept = append(kept, now)
	r.hits[key] = kept
	return len(kept) <= r.max
}

func (r *MemoryRateLimiter) prune(ctx context.Context) {
	tick := time.NewTicker(time.Hour)
	defer tick.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-tick.C:
			r.mu.Lock()
			cutoff := time.Now().Add(-r.window)
			for k, ts := range r.hits {
				live := false
				for _, t := range ts {
					if t.After(cutoff) {
						live = true
						break
					}
				}
				if !live {
					delete(r.hits, k)
				}
			}
			r.mu.Unlock()
		}
	}
}
