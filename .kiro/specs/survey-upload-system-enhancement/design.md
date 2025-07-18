# Design Document: Survey Upload System Enhancement

## Overview

The Survey Upload System Enhancement aims to improve the current implementation of Excel file uploads for survey questions in the AI Capability Assessment platform. The current system allows administrators to upload Excel files containing survey questions to S3, which are then parsed and served to students through a Google Forms-like interface. While the basic functionality works, there are several areas that need improvement in terms of architecture, error handling, user experience, and maintainability.

This design document outlines the proposed enhancements to create a more robust, secure, and user-friendly survey upload system.

## Architecture

### Current Architecture

The current survey upload system follows this flow:

1. **Frontend (SurveyCreator.tsx)**: 
   - Handles file selection via React Dropzone
   - Parses Excel files client-side using XLSX library
   - Uploads files directly to S3 using AWS SDK with hardcoded credentials
   - Creates survey metadata in the backend via API calls

2. **S3 Storage**:
   - Stores Excel files in `forms/{workspaceName}/{filename}` structure
   - Uses direct client-side uploads with presigned URLs

3. **Backend API**:
   - Handles survey metadata creation
   - Limited validation of uploaded files
   - No processing of Excel files

4. **Survey Consumption (SurveyForm.tsx)**:
   - Attempts to load survey questions from multiple sources:
     1. S3 Excel file (if URL parameters are provided)
     2. Backend API (if survey ID is available)
     3. Local store (as fallback)
     4. Default questions (as final fallback)

### Proposed Architecture

The enhanced architecture will follow this frontend-only flow:

1. **Frontend (Enhanced SurveyCreator)**:
   - Improved file selection with drag-and-drop interface
   - Client-side validation of Excel structure before upload
   - Direct S3 upload using existing S3Service with enhanced error handling
   - Real-time progress indicators and comprehensive error handling
   - Client-side Excel parsing with preview functionality
   - Question validation and preview before survey creation

2. **S3 Storage (Enhanced)**:
   - Maintain current folder structure: `forms/{workspaceName}/{filename}`
   - Enhanced error handling for upload failures
   - Better progress tracking and retry mechanisms

3. **Backend API (Minimal Changes)**:
   - Continue using existing survey creation endpoints
   - No changes to authentication or file processing
   - Maintain current question storage in survey metadata

4. **Survey Consumption (Enhanced)**:
   - Improved error handling when loading from S3
   - Better fallback mechanisms between S3 and API sources
   - Enhanced caching and performance optimization

## Components and Interfaces

### 1. Enhanced File Upload Component

```typescript
interface FileUploadProps {
  onFileSelected: (file: File) => void;
  onFileValidated: (isValid: boolean, questions?: Question[]) => void;
  onUploadProgress: (progress: number) => void;
  acceptedFileTypes: string[];
  maxFileSize: number;
  validationSchema: ExcelValidationSchema;
}
```

The enhanced file upload component will:
- Provide drag-and-drop and file browser interfaces
- Show file details and preview before upload
- Validate file format, size, and structure
- Display clear error messages for invalid files
- Show upload progress with cancel option

### 2. Excel Parser Service

```typescript
interface ExcelParserService {
  parseExcel(file: File): Promise<ParseResult>;
  validateExcelStructure(data: any[]): ValidationResult;
  extractQuestions(data: any[]): Question[];
}

interface ParseResult {
  success: boolean;
  data?: any[];
  questions?: Question[];
  errors?: ParseError[];
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}
```

The Excel parser service will:
- Parse Excel files using XLSX library
- Validate required columns and data types
- Extract questions with proper structure
- Provide detailed error messages for invalid files

### 3. Enhanced S3 Service

```typescript
interface EnhancedS3Service {
  // Direct upload using existing AWS SDK
  uploadFile(file: File, surveyId: string, workspaceName: string, onProgress?: (progress: number) => void): Promise<S3UploadResult>;
  
  // Download and parse Excel from S3
  downloadAndParseExcel(workspaceName: string, filename: string): Promise<S3DownloadResult>;
  
  // Retry mechanism for failed uploads
  retryUpload(file: File, surveyId: string, workspaceName: string, maxRetries: number): Promise<S3UploadResult>;
}

interface S3UploadResult {
  success: boolean;
  key?: string;
  url?: string;
  error?: string;
}
```

The enhanced S3 service will:
- Use existing direct S3 upload with AWS SDK
- Implement robust error handling and retry mechanisms
- Support upload progress tracking with detailed feedback
- Provide comprehensive logging for debugging

### 4. Survey API Service (Minimal Changes)

```typescript
interface EnhancedSurveyAPI {
  // Create survey metadata (existing)
  create(survey: SurveyCreate): Promise<Survey>;
  
  // Get survey questions (existing)
  getQuestions(surveyId: string): Promise<Question[]>;
  
  // Update survey with parsed questions
  updateQuestions(surveyId: string, questions: Question[]): Promise<Survey>;
}
```

The enhanced Survey API will:
- Continue using existing survey creation endpoints
- Maintain current question storage approach
- Add better error handling for API calls
- Support updating surveys with parsed questions

## Data Models

### Survey Model (Enhanced)

```typescript
interface Survey {
  id: string;
  title: string;
  description?: string;
  workspace_id: string;
  status: 'draft' | 'active' | 'inactive';
  scale_min: number;
  scale_max: number;
  max_questions: number;
  created_at: string;
  updated_at: string;
  questions?: Question[];
  file_uploads?: FileUpload[];
}

interface Question {
  id: string;
  survey_id: string;
  text: string;
  category: string;
  order: number;
  created_at: string;
  updated_at: string;
}

interface FileUpload {
  id: string;
  survey_id: string;
  original_filename: string;
  s3_key: string;
  file_size: number;
  upload_date: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  version: number;
}
```

### Excel File Structure

The Excel file structure will be standardized with the following columns:
1. **순번** (Order): Number indicating the question order
2. **문항 내용** (Question Text): The actual question text
3. **카테고리** (Category): The category the question belongs to
4. **비고** (Notes): Optional notes or additional information

## Error Handling

### Client-Side Error Handling

1. **File Selection Errors**:
   - File type validation (only .xlsx, .xls)
   - File size validation (maximum 10MB)
   - File structure validation (required columns)

2. **Upload Errors**:
   - Network connectivity issues
   - S3 access denied errors
   - Upload timeout errors

3. **Excel Parsing Errors**:
   - Invalid Excel format
   - Missing required columns
   - Invalid data types
   - Duplicate questions

### Server-Side Error Handling

1. **S3 Integration Errors**:
   - S3 access errors
   - Storage quota exceeded
   - Invalid file format

2. **Excel Processing Errors**:
   - Malformed Excel structure
   - Missing required data
   - Data validation failures

3. **Database Errors**:
   - Survey creation failures
   - Question insertion failures
   - Concurrent modification conflicts

### Error Recovery Strategies

1. **Automatic Retries**:
   - Implement exponential backoff for transient errors
   - Retry failed uploads up to 3 times

2. **Partial Success Handling**:
   - Allow partial question imports with warnings
   - Provide option to continue or cancel on partial failures

3. **Fallback Mechanisms**:
   - Client-side parsing as fallback for server-side failures
   - Local storage for temporary data preservation

## Testing Strategy

### Unit Tests

1. **Excel Parser Tests**:
   - Test parsing of valid Excel files
   - Test validation of required columns
   - Test handling of malformed Excel files
   - Test extraction of questions from various formats

2. **S3 Service Tests**:
   - Test presigned URL generation
   - Test file upload with mocked S3 responses
   - Test error handling for various S3 errors

3. **API Service Tests**:
   - Test survey creation
   - Test question extraction
   - Test error handling for API failures

### Integration Tests

1. **End-to-End Upload Flow**:
   - Test complete flow from file selection to survey creation
   - Test with various file sizes and structures
   - Test error recovery mechanisms

2. **Survey Consumption Flow**:
   - Test loading questions from backend API
   - Test fallback to S3 when API fails
   - Test rendering of questions in survey form

### User Acceptance Testing

1. **Administrator Workflows**:
   - Test survey creation with Excel uploads
   - Test handling of invalid Excel files
   - Test survey management after upload

2. **Student Workflows**:
   - Test survey rendering with uploaded questions
   - Test survey completion and submission
   - Test error handling during survey taking

## Security Considerations

1. **S3 Access Security**:
   - Maintain existing AWS credentials configuration
   - Implement proper file type and size validation
   - Add client-side security checks before upload

2. **File Validation Security**:
   - Validate file types before processing (.xlsx, .xls only)
   - Implement file size limits to prevent DoS attacks (10MB max)
   - Add content validation to prevent malicious Excel files

3. **Data Protection**:
   - Maintain existing data encryption in transit
   - Implement proper client-side validation before upload
   - Add comprehensive logging for debugging and monitoring

## Implementation Phases

### Phase 1: Enhanced File Upload UI
- Improve drag-and-drop file selection interface
- Implement real-time file validation and preview
- Add comprehensive upload progress indicators
- Create detailed error messaging with recovery options

### Phase 2: Robust Excel Processing
- Enhance client-side Excel parsing and validation
- Implement question preview before upload
- Add support for various Excel formats and structures
- Create comprehensive error handling for parsing failures

### Phase 3: Enhanced S3 Integration
- Improve existing S3Service with better error handling
- Implement retry mechanisms with exponential backoff
- Add detailed upload progress tracking
- Enhance logging and debugging capabilities

### Phase 4: Survey Consumption Optimization
- Improve question loading from S3 and API sources
- Implement better fallback mechanisms
- Add caching for improved performance
- Optimize error recovery during survey taking