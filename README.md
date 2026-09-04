# Solar System — Jenkins and Docker CI/CD

[![CI](https://github.com/huzaifatariq-sahibops/solar-system-gitea/actions/workflows/ci.yml/badge.svg)](https://github.com/huzaifatariq-sahibops/solar-system-gitea/actions/workflows/ci.yml)

A Node.js and MongoDB application used to demonstrate a tested container delivery pipeline. A successful Jenkins build:

1. checks out the source;
2. starts and seeds an isolated MongoDB test container;
3. installs dependencies and runs the test suite with coverage enforcement;
4. builds the application image;
5. starts the image and checks its liveness endpoint; and
6. publishes commit-specific and `latest` tags to Docker Hub from the `main` branch.

## Portfolio extension

This repository is a fork of Siddharth Barahalikar's [Solar System course project](https://github.com/sidd-harth/solar-system-gitea). The application provides the starter workload. This fork adds the following CI/CD evidence:

- a declarative [Jenkins pipeline](./Jenkinsfile);
- an ephemeral, reproducibly seeded MongoDB test environment;
- test and code-coverage gates before image publication;
- a container smoke test against `GET /live`;
- Docker Hub authentication through Jenkins Credentials and `--password-stdin`;
- traceable image tags based on the Git commit SHA;
- a non-root production image with a built-in health check; and
- a GitHub Actions workflow that independently proves the tests and Docker build.

## Pipeline flow

```text
Git push
   |
   v
Jenkins checkout
   |
   v
MongoDB test container -> seed planets -> npm test + coverage
   |
   v
Docker build -> container smoke test
   |
   v
Docker Hub: <username>/solar-system:<commit-sha>
                                  + latest
```

If a test, image build, or smoke test fails, Jenkins stops before publishing.

## Jenkins requirements

- A Linux Jenkins agent with Git and Docker available.
- The Jenkins user must be authorized to access the Docker daemon. Docker socket access is effectively root-equivalent, so use a dedicated, controlled build agent.
- A **Username with password** Jenkins credential with ID `dockerhub-credentials`:
  - username: Docker Hub username;
  - password: a scoped Docker Hub access token, not the account password.
- A Jenkins Multibranch Pipeline pointed at this repository so the `main` branch condition is available.
- Network access to GitHub, Docker Hub, npm, and the container registries used by the pipeline.

Do not place tokens in the `Jenkinsfile`, Git repository, build parameters, or Docker image. Jenkins masks the bound token in logs, and `docker login --password-stdin` avoids placing it in the command arguments.

## Run locally

The application expects MongoDB connection information at runtime.

```bash
docker network create solar-system-local

docker run --detach \
  --name solar-system-mongo \
  --network solar-system-local \
  mongo:7

docker exec --interactive solar-system-mongo \
  mongosh solar-system --quiet < ci/mongo-init.js

docker build --tag solar-system:local .

docker run --detach \
  --name solar-system-app \
  --network solar-system-local \
  --publish 3000:3000 \
  --env MONGO_URI=mongodb://solar-system-mongo:27017/solar-system \
  solar-system:local
```

Open <http://localhost:3000> or check the liveness endpoint:

```bash
curl http://localhost:3000/live
```

Expected response:

```json
{ "status": "live" }
```

Clean up:

```bash
docker rm --force solar-system-app solar-system-mongo
docker network rm solar-system-local
```

## Run tests without Jenkins

With a seeded MongoDB instance available:

```bash
npm ci
MONGO_URI=mongodb://127.0.0.1:27017/solar-system npm run coverage
```

The GitHub Actions workflow performs these steps automatically on pushes and pull requests to `main`.

## Troubleshooting

- **Docker daemon permission denied:** authorize the Jenkins service account on the dedicated Docker agent, then restart its session or service.
- **Docker Hub push denied:** verify the credential ID, Docker Hub username, token scope, and target namespace.
- **Tests cannot find planets:** confirm MongoDB is healthy and `ci/mongo-init.js` ran against the `solar-system` database.
- **Image builds but the smoke test fails:** inspect `docker logs <container>` and verify `MONGO_URI` resolves inside the Docker network.

## Application endpoints

- `GET /` — web interface
- `POST /planet` — planet details by numeric ID
- `GET /live` — liveness
- `GET /ready` — readiness
- `GET /os` — host and environment details
- `GET /api-docs` — OpenAPI document

## License and attribution

The upstream application's `package.json` identifies it as MIT-licensed and credits Siddharth Barahalikar. This README preserves that attribution and distinguishes the CI/CD additions made in this fork.
