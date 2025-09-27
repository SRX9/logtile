# Changelog Lambda Function

This AWS Lambda function processes changelog jobs by fetching commit details from GitHub.

## Required Environment Variables

The following environment variables must be set in your AWS Lambda configuration:

### Database
- `DATABASE_URL` - PostgreSQL connection string

### GitHub OAuth
- `GITHUB_CLIENT_ID` - GitHub OAuth client ID
- `GITHUB_CLIENT_SECRET` - GitHub OAuth client secret

### Security
- `TOKEN_ENCRYPTION_KEY` - 32-character key used to encrypt/decrypt GitHub tokens

## Usage

The lambda expects an event payload with a `jobId` field:

```json
{
  "jobId": "uuid-of-changelog-job"
}
```

## Features

- Fetches job details from the database
- Decrypts stored GitHub tokens
- Processes commits in batches to respect rate limits
- Fetches detailed commit information including file changes
- Stores results as JSON files
- Updates job status in database
