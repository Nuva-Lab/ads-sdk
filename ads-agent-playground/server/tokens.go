package main

import (
	"context"
	"errors"
	admin "github.com/Nuva-Lab/ads-sdk/go"
	"sync"
	"time"
)

type issueToken func(context.Context, string) (admin.TokenResponse, error)
type tokenFlight struct {
	done  chan struct{}
	value admin.TokenResponse
	err   error
}
type tokenBroker struct {
	mu          sync.Mutex
	issue       issueToken
	externalID  string
	userID      string
	identityErr error
	cached      admin.TokenResponse
	flight      *tokenFlight
	now         func() time.Time
	skew        time.Duration
}

func newTokenBroker(issue issueToken, externalID string) *tokenBroker {
	return &tokenBroker{issue: issue, externalID: externalID, now: time.Now, skew: time.Minute}
}
func (b *tokenBroker) get(ctx context.Context, force bool) (admin.TokenResponse, error) {
	b.mu.Lock()
	if b.identityErr != nil {
		err := b.identityErr
		b.mu.Unlock()
		return admin.TokenResponse{}, err
	}
	if !force && b.cached.AccessToken != "" && b.now().Add(b.skew).Before(b.cached.ExpiresAt) {
		value := b.cached
		b.mu.Unlock()
		return value, nil
	}
	if flight := b.flight; flight != nil {
		b.mu.Unlock()
		select {
		case <-flight.done:
			return flight.value, flight.err
		case <-ctx.Done():
			return admin.TokenResponse{}, ctx.Err()
		}
	}
	flight := &tokenFlight{done: make(chan struct{})}
	b.flight = flight
	b.mu.Unlock()
	issueCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	value, err := b.issue(issueCtx, b.externalID)
	cancel()
	b.mu.Lock()
	if err == nil && (value.AccessToken == "" || !value.ExpiresAt.After(b.now()) || value.User.ID == "" || value.User.ExternalUserID != b.externalID) {
		err = errors.New("token service returned an invalid user token")
	}
	if err == nil && b.userID != "" && value.User.ID != b.userID {
		b.identityErr = errors.New("the token user changed; restart with the intended user configuration")
		err = b.identityErr
	}
	if err == nil {
		b.cached = value
		b.userID = value.User.ID
	} else {
		value = admin.TokenResponse{}
	}
	flight.value, flight.err = value, err
	b.flight = nil
	close(flight.done)
	b.mu.Unlock()
	return value, err
}
