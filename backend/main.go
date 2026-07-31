package main

import (
	"fmt"
	"log"
	"net/http"
)

func main() {
	fmt.Println("Sensensble Geometry Backend Gateway starting...")

	// Initialize the database connection
	InitDB()

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// Setup a protected API route
	mux := http.NewServeMux()
	mux.HandleFunc("/api/secure", func(w http.ResponseWriter, r *http.Request) {
		user, err := GetUser(r.Context())
		if err != nil {
			http.Error(w, "User context error", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, "Secure data accessed by: %s", user.Email)
	})

	// Wrap the API routes with the AuthMiddleware
	http.Handle("/api/", AuthMiddleware(mux))

	log.Fatal(http.ListenAndServe(":8080", nil))
}
