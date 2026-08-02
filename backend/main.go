package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	pb "sensensblegeometry-backend/proto"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for dev
	},
}

type Payload struct {
	Context  string `json:"context"`
	Language string `json:"language"`
	Objects  []struct {
		Id   string    `json:"id"`
		Data []float32 `json:"data"`
	} `json:"objects"`
}

func handleWebSocket(w http.ResponseWriter, r *http.Request, grpcClient pb.AnalysisServiceClient) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("upgrade error:", err)
		return
	}
	defer conn.Close()

	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			log.Println("read error:", err)
			break
		}

		var p Payload
		if err := json.Unmarshal(message, &p); err != nil {
			log.Println("json unmarshal error:", err)
			continue
		}

		// Convert Payload to Protobuf Request
		req := &pb.AnalysisRequest{
			Context:  p.Context,
			Language: p.Language,
		}
		for _, obj := range p.Objects {
			req.Objects = append(req.Objects, &pb.GeometricState{
				Id:   obj.Id,
				Data: obj.Data,
			})
		}

		// Call gRPC worker
		res, err := grpcClient.AnalyzeState(context.Background(), req)
		if err != nil {
			log.Println("grpc call error:", err)
			_ = conn.WriteJSON(map[string]string{"status": "error", "message": err.Error()})
			continue
		}

		// Send back to client
		if err := conn.WriteJSON(map[string]string{
			"status": res.Status,
			"code":   res.Code,
		}); err != nil {
			log.Println("websocket write error:", err)
			break
		}
	}
}

func main() {
	fmt.Println("Sensensble Geometry Backend Gateway starting...")

	// Initialize the database connection
	InitDB()

	// Connect to Python gRPC Worker on port 50051
	grpcConn, err := grpc.NewClient("localhost:50051", grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatalf("did not connect: %v", err)
	}
	defer grpcConn.Close()
	c := pb.NewAnalysisServiceClient(grpcConn)

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("OK"))
	})

	// Add WebSocket endpoint (outside auth middleware since standard WebSockets can't send Headers easily)
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		handleWebSocket(w, r, c)
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

	log.Println("Go Gateway listening on :8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal(err)
	}
}
