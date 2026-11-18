package com.resumeiq.service;

import java.util.Map;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

@Service
public class ResumeAnalyzerService {

    private static final Set<String> COMMON_WORDS = Set.of(
            "the", "and", "for", "with", "from", "you", "your", "our", "are", "will", "that", "this",
            "have", "has", "who", "what", "when", "where", "was", "were", "can", "all", "any", "into",
            "a", "an", "of", "to", "in", "on", "at", "by", "as", "or", "be", "is", "it", "its",
            "their", "they", "them", "we", "us", "he", "she", "his", "her", "which", "while", "than",
            "then", "also", "such", "per", "other", "both", "each", "more", "most", "some", "many",
            "job", "candidate", "ideal", "experience", "experienced", "duties", "responsibilities", "responsibility",
            "responsible", "include", "includes", "including", "preferred", "required", "requirements", "role",
            "position", "work", "working", "area", "areas", "able", "ability", "ensure", "ensuring", "maintain",
            "maintaining", "support", "supporting", "help", "helps", "across", "within", "daily", "day", "strong",
            "excellent", "good", "plus", "etc", "years", "year", "new", "use", "using", "based", "related");

    private static final Set<String> SKILL_PHRASES = Set.of(
            "order fulfillment", "inventory management", "inventory control", "quality control", "quality assurance",
            "supply chain", "order picking", "order packing", "order processing", "warehouse operations",
            "warehouse management", "warehouse safety", "warehouse sanitation", "record keeping",
            "continuous improvement", "customer service", "project management", "software development",
            "spring boot", "rest api", "data analysis", "machine learning", "version control", "cloud computing",
            "team collaboration", "problem solving", "time management", "logistics management", "materials handling",
            "stock control", "lean manufacturing", "kanban system", "attention to detail", "communication skills",
            "quality standards", "safety standards", "health and safety", "database management", "user experience",
            "front end", "back end", "full stack", "unit testing", "api development", "agile methodology");
    private static final Set<String> SHORT_TECH_TERMS = Set.of("c#", "r", "go");

    public Map<String, Object> preview(String resumeText) {
        if (resumeText == null || resumeText.isBlank()) {
            return Map.of("wordCount", 0, "characterCount", 0);
        }

        int wordCount = resumeText.trim().split("\\s+").length;
        return Map.of("wordCount", wordCount, "characterCount", resumeText.length());
    }

    public Map<String, Object> analyze(String resumeText, String jobDescription) {
        if (jobDescription == null || jobDescription.isBlank()) {
            throw new IllegalArgumentException("Job description cannot be blank.");
        }

        Set<String> resumeWords = keywords(resumeText);
        Set<String> jobKeywords = keywords(jobDescription);
        Set<String> matchedKeywords = new TreeSet<>(jobKeywords);
        matchedKeywords.retainAll(resumeWords);
        Set<String> missingKeywords = new TreeSet<>(jobKeywords);
        missingKeywords.removeAll(resumeWords);
        int matchPercent = jobKeywords.isEmpty()
                ? 0
                : Math.round((matchedKeywords.size() * 100f) / jobKeywords.size());

        Map<String, Object> result = new java.util.LinkedHashMap<>(preview(resumeText));
        result.put("keywordMatchPercent", matchPercent);
        result.put("matchedKeywords", List.copyOf(matchedKeywords));
        result.put("missingKeywords", List.copyOf(missingKeywords));
        return result;
    }

    private Set<String> keywords(String text) {
        String normalized = text.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9+#]+", " ").trim();
        if (normalized.isBlank()) {
            return Set.of();
        }

        Set<String> matchedPhrases = SKILL_PHRASES.stream()
                .filter(phrase -> Pattern.compile("\\b" + Pattern.quote(phrase) + "\\b").matcher(normalized).find())
                .collect(Collectors.toCollection(TreeSet::new));
        Set<String> phraseWords = matchedPhrases.stream()
                .flatMap(phrase -> Arrays.stream(phrase.split(" ")))
                .collect(Collectors.toSet());
        Set<String> terms = Arrays.stream(normalized.split("\\s+"))
                .filter(word -> (word.length() > 2 || SHORT_TECH_TERMS.contains(word))
                        && !COMMON_WORDS.contains(word) && !phraseWords.contains(word))
                .collect(Collectors.toCollection(TreeSet::new));
        terms.addAll(matchedPhrases);
        return terms;
    }
}
