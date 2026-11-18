package com.resumeiq.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.resumeiq.entity.QuizAttempt;

public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, String> {
    List<QuizAttempt> findAllByClientIdOrderByCompletedAtDesc(String clientId);
}
