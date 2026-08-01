package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
	pb "github.com/iig/sensensblegeometry/backend/gateway/proto"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
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
			conn.WriteJSON(map[string]string{"status": "error", "message": err.Error()})
			continue
		}

		// Send back to client
		conn.WriteJSON(map[string]string{
			"status": res.Status,
			"code":   res.Code,
		})
	}
}

func main() {
	// Connect to Python gRPC Worker on port 50051
	conn, err := grpc.NewClient("localhost:50051", grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatalf("did not connect: %v", err)
	}
	defer conn.Close()
	c := pb.NewAnalysisServiceClient(conn)

	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		handleWebSocket(w, r, c)
	})

	log.Println("Go Gateway listening on :8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal(err)
	}
}
