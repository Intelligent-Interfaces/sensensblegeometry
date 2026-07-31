package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/tursodatabase/libsql-client-go/libsql"
)

var DB *sql.DB

// InitDB initializes the libSQL/Turso database connection.
func InitDB() {
	dbURL := os.Getenv("TURSO_DATABASE_URL")
	if dbURL == "" {
		// Fallback to local SQLite file for development
		dbURL = "file:./sensensblegeometry.db"
	}

	db, err := sql.Open("libsql", dbURL)
	if err != nil {
		log.Fatalf("Failed to open db %s: %s", dbURL, err)
	}

	// Verify connection
	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to connect to db %s: %s", dbURL, err)
	}

	fmt.Printf("Connected to libSQL at %s\n", dbURL)
	DB = db
}
