package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	wallet "github.com/Shivam-Patel-G/blackhole-blockchain/services/wallet/wallet"
	"github.com/golang-jwt/jwt/v5"
)

// JWTClaims represents the claims inside the BHIV SSO token
type JWTClaims struct {
	UserID      string   `json:"user_id"`
	Email       string   `json:"email"`
	TenantID    string   `json:"tenant_id"`
	Roles       []string `json:"roles"`
	Permissions []string `json:"permissions"`
	AllowedApps []string `json:"allowedApps"`
	jwt.RegisteredClaims
}

// requireAuth middleware to check BHIV SSO authentication
func requireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Local dev testing bypass
		if os.Getenv("DEV_MODE") == "true" {
			ctx := context.WithValue(r.Context(), "userID", "dev_user")
			next(w, r.WithContext(ctx))
			return
		}

		cookie, err := r.Cookie("bhiv_token")
		if err != nil {
			handleUnauthorized(w, r)
			return
		}

		tokenString := cookie.Value
		secret := os.Getenv("JWT_SECRET")
		if secret == "" {
			logError("AUTH_VERIFY", fmt.Errorf("JWT_SECRET is not set"))
			handleUnauthorized(w, r)
			return
		}

		// Parse and validate the token
		claims := &JWTClaims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(secret), nil
		})

		if err != nil || !token.Valid {
			logError("AUTH_VERIFY", fmt.Errorf("invalid token: %v", err))
			handleUnauthorized(w, r)
			return
		}

		// Check allowedApps for 'vajra'
		appAllowed := false
		for _, app := range claims.AllowedApps {
			if app == "vajra" {
				appAllowed = true
				break
			}
		}

		if !appAllowed {
			logError("AUTH_VERIFY", fmt.Errorf("app 'vajra' not in allowedApps for user %s", claims.Email))
			handleUnauthorized(w, r)
			return
		}

		// Synchronize the user to local DB
		err = syncUserToLocalDB(claims)
		if err != nil {
			logError("AUTH_SYNC", fmt.Errorf("failed to sync user: %v", err))
			handleUnauthorized(w, r)
			return
		}

		// Set context so handlers can retrieve it
		ctx := context.WithValue(r.Context(), "user_claims", claims)
		next(w, r.WithContext(ctx))
	}
}

// handleUnauthorized manages redirection or API 401s
func handleUnauthorized(w http.ResponseWriter, r *http.Request) {
	if strings.HasPrefix(r.URL.Path, "/api/") {
		sendJSONResponse(w, APIResponse{
			Success: false,
			Message: "Authentication required",
		}, http.StatusUnauthorized)
		return
	}
	redirectURL := os.Getenv("AUTH_REDIRECT_URL")
	if redirectURL == "" {
		redirectURL = "https://products.blackholeinfiverse.com/login"
	}
	http.Redirect(w, r, redirectURL, http.StatusSeeOther)
}

// syncUserToLocalDB ensures a wallet.User exists for the central SSO user
func syncUserToLocalDB(claims *JWTClaims) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	username := claims.Email
	if username == "" {
		username = "user_" + claims.UserID
	}

	// Fetch or create user in local database
	if wallet.UserCollection == nil && wallet.FallbackDB == nil {
		fmt.Printf("⚠️  [syncUserToLocalDB] Database not available, skipping sync for %s\n", username)
		return nil
	}

	// 2. Try to find the user locally first
	_, err := wallet.GetUserByUsername(ctx, username)
	if err != nil {
		// User doesn't exist, create them
		_, err := wallet.RegisterUser(ctx, username, "sso-managed-" + claims.Subject)
		if err != nil {
			return fmt.Errorf("failed to create local user: %v", err)
		}
	}

	return nil
}

// getUserFromContext retrieves the user from the JWT claims stored in the context
func getUserFromContext(r *http.Request) (*wallet.User, error) {
	username, ok := r.Context().Value("username").(string)
	if !ok || username == "" {
		return nil, fmt.Errorf("user not authenticated")
	}

	user, err := wallet.GetUserByUsername(r.Context(), username)
	if err != nil {
		return nil, fmt.Errorf("user not found: %v", err)
	}

	return user, nil
}
