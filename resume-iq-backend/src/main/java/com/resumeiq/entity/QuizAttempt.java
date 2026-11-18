package com.resumeiq.entity;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;

@Entity
@Table(name = "quiz_attempts")
public class QuizAttempt {

    @Id
    @Column(length = 80)
    private String id;

    @Column(nullable = false, length = 36)
    private String clientId;

    @Column(nullable = false)
    private Instant completedAt;

    @Lob
    @Column(nullable = false)
    private String attemptJson;

    protected QuizAttempt() {
    }

    public QuizAttempt(String id, String clientId, Instant completedAt, String attemptJson) {
        this.id = id;
        this.clientId = clientId;
        this.completedAt = completedAt;
        this.attemptJson = attemptJson;
    }

    public String getId() {
        return id;
    }

    public String getClientId() {
        return clientId;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public String getAttemptJson() {
        return attemptJson;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public void setCompletedAt(Instant completedAt) {
        this.completedAt = completedAt;
    }

    public void setAttemptJson(String attemptJson) {
        this.attemptJson = attemptJson;
    }
}
