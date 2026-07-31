package main

import (
	"context"
	"fmt"
	"net/http"
	"strings"
)

type contextKey string

const userContextKey contextKey = "user"

// User represents an authenticated identity
type User struct {
	ID    string
	Email string
}

// AuthMiddleware is a stub for Firebase/Identity Platform JWT verification.
// It intercepts requests, extracts the Bearer token, and populates the context.
func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Unauthorized: Missing Authorization header", http.StatusUnauthorized)
			return
		}

		parts := strings.Split(authHeader, "Bearer ")
		if len(parts) != 2 {
			http.Error(w, "Unauthorized: Invalid Authorization header format", http.StatusUnauthorized)
			return
		}

		tokenString := parts[1]

		// TODO: Integrate Firebase Admin SDK for actual token verification here.
		// For now, we perform a basic stub validation.
		if tokenString == "invalid-token" {
			http.Error(w, "Unauthorized: Invalid token", http.StatusUnauthorized)
			return
		}

		// Stub user for development
		user := &User{
			ID:    "stub-user-id",
			Email: "operator@sensensblegeometry.lab",
		}

		// Attach user to context
		ctx := context.WithValue(r.Context(), userContextKey, user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// GetUser extracts the user from the request context
func GetUser(ctx context.Context) (*User, error) {
	user, ok := ctx.Value(userContextKey).(*User)
	if !ok {
		return nil, fmt.Errorf("user not found in context")
	}
	return user, nil
}
