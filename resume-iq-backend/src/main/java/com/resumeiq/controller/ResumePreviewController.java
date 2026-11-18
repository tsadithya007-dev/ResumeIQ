package com.resumeiq.controller;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.List;
import java.util.Map;

import com.resumeiq.dto.ResumePreviewRequest;
import com.resumeiq.dto.QuizEvaluationRequest;
import com.resumeiq.service.ResumeAssessmentService;
import com.resumeiq.service.ResumeAnalyzerService;
import com.resumeiq.service.ResumeFileTextExtractor;
import com.resumeiq.service.QuizQuestionService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/resumes")
@CrossOrigin(origins = { "http://localhost:5173", "http://127.0.0.1:5173" })
public class ResumePreviewController {

    private final ResumeAssessmentService resumeAssessmentService;
    private final ResumeAnalyzerService resumeAnalyzerService;
    private final ResumeFileTextExtractor resumeFileTextExtractor;
    private final QuizQuestionService quizQuestionService;

    public ResumePreviewController(ResumeAssessmentService resumeAssessmentService,
            ResumeAnalyzerService resumeAnalyzerService,
            ResumeFileTextExtractor resumeFileTextExtractor,
            QuizQuestionService quizQuestionService) {
        this.resumeAssessmentService = resumeAssessmentService;
        this.resumeAnalyzerService = resumeAnalyzerService;
        this.resumeFileTextExtractor = resumeFileTextExtractor;
        this.quizQuestionService = quizQuestionService;
    }

    @PostMapping("/preview")
    public Map<String, Object> preview(@RequestBody ResumePreviewRequest request) {
        return resumeAnalyzerService.preview(request.getResumeText());
    }

    @PostMapping({"/upload-text", "/upload"})
    public Map<String, Object> previewUploadedFile(@RequestParam("file") MultipartFile file) throws IOException {
        String resumeText = extractResumeText(file);
        if (resumeText.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "No text could be extracted. The PDF may be blank, image-only, or too low quality to read.");
        }
        return resumeAnalyzerService.preview(resumeText);
    }

    @PostMapping("/analyze")
    public Map<String, Object> analyzeResume(
            @RequestParam("file") MultipartFile file,
            @RequestParam("jobDescription") String jobDescription) throws IOException {
        String resumeText = extractResumeText(file);
        if (resumeText.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No readable resume text was found.");
        }
        return resumeAssessmentService.analyze(resumeText, jobDescription);
    }

    @PostMapping("/quiz")
    public Map<String, Object> generateQuiz(
            @RequestParam("file") MultipartFile file,
            @RequestParam("jobDescription") String jobDescription,
            @RequestParam(value = "previousQuestions", required = false) List<String> previousQuestions,
            @RequestParam(value = "topic", required = false) String topic) throws IOException {
        String resumeText = extractResumeText(file);
        if (resumeText.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No readable resume text was found.");
        }
        if (jobDescription.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Add a job description first.");
        }
        return quizQuestionService.generateQuestions(resumeText, jobDescription,
                previousQuestions == null ? List.of() : previousQuestions, topic);
    }

    @PostMapping("/quiz/evaluate")
    public Map<String, Object> evaluateQuiz(@RequestBody QuizEvaluationRequest request) {
        if (request.jobDescription() == null || request.jobDescription().isBlank()
                || request.answers() == null || request.answers().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Provide a job description and at least one quiz answer.");
        }
        if (request.answers().stream().anyMatch(answer -> answer.answer() == null || answer.answer().isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Answer every question before submitting.");
        }
        return quizQuestionService.evaluateAnswers(request);
    }

    private String extractResumeText(MultipartFile file) throws IOException {
        String filename = file.getOriginalFilename();
        if (file.isEmpty() || filename == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Upload a non-empty .txt or .pdf file.");
        }

        String lowercaseFilename = filename.toLowerCase(Locale.ROOT);
        if (lowercaseFilename.endsWith(".txt")) {
            return new String(file.getBytes(), StandardCharsets.UTF_8);
        }
        if (lowercaseFilename.endsWith(".pdf")) {
            return resumeFileTextExtractor.extractPdf(file.getBytes());
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "For now, upload a .txt or .pdf file.");
    }
}
