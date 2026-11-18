package com.resumeiq.dto;

import java.util.Map;

public record QuizHistorySaveRequest(String clientId, Map<String, Object> attempt) {
}
