package com.resumeiq.dto;

import java.util.List;

public record QuizEvaluationRequest(String jobDescription, List<Answer> answers) {
    public record Answer(String question, String skill, String type, String answer) { }
}
