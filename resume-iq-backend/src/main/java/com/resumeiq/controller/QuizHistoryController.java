package com.resumeiq.controller;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.resumeiq.dto.QuizHistorySaveRequest;
import com.resumeiq.entity.QuizAttempt;
import com.resumeiq.repository.QuizAttemptRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/quiz-history")
@CrossOrigin(origins = { "http://localhost:5173", "http://127.0.0.1:5173" })
public class QuizHistoryController {

    private final QuizAttemptRepository repository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public QuizHistoryController(QuizAttemptRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Map<String, Object>> getHistory(@RequestParam String clientId) {
        validateClientId(clientId);
        return repository.findAllByClientIdOrderByCompletedAtDesc(clientId).stream()
                .map(this::toAttempt)
                .toList();
    }

    @PostMapping
    public ResponseEntity<Map<String, Boolean>> saveAttempt(@RequestBody QuizHistorySaveRequest request) {
        if (request == null || request.attempt() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A quiz attempt is required.");
        }
        validateClientId(request.clientId());
        String attemptId = requiredString(request.attempt(), "id");
        Instant completedAt;
        try {
            completedAt = Instant.parse(requiredString(request.attempt(), "completedAt"));
        } catch (RuntimeException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The quiz completion date is invalid.");
        }

        QuizAttempt attempt = repository.findById(attemptId).orElse(null);
        if (attempt != null && !attempt.getClientId().equals(request.clientId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "That quiz attempt already belongs to another browser.");
        }
        try {
            String json = objectMapper.writeValueAsString(request.attempt());
            if (attempt == null) {
                attempt = new QuizAttempt(attemptId, request.clientId(), completedAt, json);
            } else {
                attempt.setCompletedAt(completedAt);
                attempt.setAttemptJson(json);
            }
            repository.save(attempt);
            return ResponseEntity.ok(Map.of("saved", true));
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not save quiz history.", exception);
        }
    }

    private Map<String, Object> toAttempt(QuizAttempt attempt) {
        try {
            return objectMapper.readValue(attempt.getAttemptJson(), new TypeReference<Map<String, Object>>() { });
        } catch (Exception exception) {
            throw new IllegalStateException("Could not read a saved quiz attempt.", exception);
        }
    }

    private void validateClientId(String clientId) {
        try {
            UUID.fromString(clientId);
        } catch (RuntimeException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A valid browser ID is required.");
        }
    }

    private String requiredString(Map<String, Object> values, String field) {
        Object value = values.get(field);
        if (!(value instanceof String text) || text.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quiz attempt is missing " + field + ".");
        }
        return text;
    }
}
