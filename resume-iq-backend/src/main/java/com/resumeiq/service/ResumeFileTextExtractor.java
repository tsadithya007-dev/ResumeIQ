package com.resumeiq.service;

import java.io.IOException;
import java.awt.image.BufferedImage;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.StringJoiner;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class ResumeFileTextExtractor {

    private final String tesseractCommand;

    public ResumeFileTextExtractor(
            @Value("${resumeiq.ocr.command:C:/Program Files/Tesseract-OCR/tesseract.exe}") String tesseractCommand) {
        this.tesseractCommand = tesseractCommand;
    }

    public String extractPdf(byte[] pdfBytes) throws IOException {
        try (PDDocument document = Loader.loadPDF(pdfBytes)) {
            PDFTextStripper textStripper = new PDFTextStripper();
            PDFRenderer renderer = new PDFRenderer(document);
            StringJoiner extractedText = new StringJoiner(System.lineSeparator());

            for (int pageNumber = 1; pageNumber <= document.getNumberOfPages(); pageNumber++) {
                textStripper.setStartPage(pageNumber);
                textStripper.setEndPage(pageNumber);
                String pageText = textStripper.getText(document).trim();

                if (pageText.isBlank()) {
                    BufferedImage pageImage = renderer.renderImageWithDPI(pageNumber - 1, 300);
                    pageText = runOcr(pageImage).trim();
                }

                if (!pageText.isBlank()) {
                    extractedText.add(pageText);
                }
            }

            return extractedText.toString();
        }
    }

    private String runOcr(BufferedImage pageImage) throws IOException {
        Path tempDirectory = Files.createTempDirectory("resumeiq-ocr-");
        Path imagePath = tempDirectory.resolve("page.png");
        Path outputBase = tempDirectory.resolve("recognized-text");
        Path textPath = tempDirectory.resolve("recognized-text.txt");

        try {
            javax.imageio.ImageIO.write(pageImage, "png", imagePath.toFile());
            Process process = new ProcessBuilder(
                    tesseractCommand, imagePath.toString(), outputBase.toString(), "-l", "eng")
                    .redirectError(ProcessBuilder.Redirect.INHERIT)
                    .start();
            int exitCode;
            try {
                exitCode = process.waitFor();
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                throw new IOException("OCR was interrupted", exception);
            }

            if (exitCode != 0 || !Files.exists(textPath)) {
                throw new IOException("Tesseract could not read this PDF page.");
            }
            return Files.readString(textPath, StandardCharsets.UTF_8);
        } finally {
            Files.deleteIfExists(textPath);
            Files.deleteIfExists(imagePath);
            Files.deleteIfExists(tempDirectory);
        }
    }
}
