# AWS App Runner Deployment

## Architecture

- One AWS App Runner service
- One Docker container
- Public web server: Next.js standalone on `0.0.0.0:$PORT`
- Internal API server: FastAPI on `127.0.0.1:8000`
- Frontend API routes proxy to the internal FastAPI service via `AUDIT_API_BASE_URL`

## Local Docker

```bash
docker build -t siteanalyzer-ai .
docker run --rm -p 3000:3000 \
  --env-file .env \
  -e DEFAULT_AI_BACKEND=openrouter \
  siteanalyzer-ai
```

Alternative without an env file:

```bash
docker run --rm -p 3000:3000 \
  -e OPENROUTER_API_KEY=your_key_here \
  -e DEFAULT_AI_BACKEND=openrouter \
  siteanalyzer-ai
```

Notes:

- `.env` is loaded in local source runs, but it is not copied into the Docker image.
- If you only run `docker build` and `docker run` without `--env-file` or `-e OPENROUTER_API_KEY=...`, the container will not see your OpenRouter key.
- Check `http://127.0.0.1:3000/api/health` after startup to confirm `backend.ai.openrouter_configured` is `true`.

Health check:

```bash
curl http://127.0.0.1:3000/api/health
```

## ECR

Set variables:

```bash
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=123456789012
ECR_REPO=siteanalyzer-ai
IMAGE_TAG=latest
```

Create the repository:

```bash
aws ecr create-repository --repository-name $ECR_REPO --region $AWS_REGION
```

Authenticate Docker:

```bash
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
```

Build, tag, and push:

```bash
docker build -t $ECR_REPO:$IMAGE_TAG .
docker tag $ECR_REPO:$IMAGE_TAG $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:$IMAGE_TAG
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:$IMAGE_TAG
```

## App Runner

Create an App Runner service from the ECR image in the AWS Console or CLI.

Recommended runtime settings:

- Port: `3000`
- Health check path: `/api/health`

Set these environment variables in App Runner:

- `OPENROUTER_API_KEY`
- `DEFAULT_AI_BACKEND=openrouter`
- `OPENROUTER_MODEL=openai/gpt-oss-20b:free`
- `OPENROUTER_REQUEST_TIMEOUT_S=180`
- `AUDIT_API_BASE_URL=http://127.0.0.1:8000`

## Redeploy

1. Build and push a new image tag to ECR.
2. Trigger a new App Runner deployment from the updated image.
