pipeline {
    agent any

    environment {
        APP_NAME = 'solar-system'
        CI_NETWORK = "solar-system-ci-${BUILD_NUMBER}"
        MONGO_CONTAINER = "solar-system-mongo-${BUILD_NUMBER}"
        APP_CONTAINER = "solar-system-app-${BUILD_NUMBER}"
    }

    options {
        disableConcurrentBuilds()
        timestamps()
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Prepare') {
            steps {
                script {
                    env.IMAGE_TAG = sh(
                        script: 'git rev-parse --short=12 HEAD',
                        returnStdout: true
                    ).trim()
                    env.LOCAL_IMAGE = "${APP_NAME}:${IMAGE_TAG}"
                }
            }
        }

        stage('Test') {
            steps {
                sh '''
                    set -eu
                    docker network create "$CI_NETWORK"
                    docker run --detach \
                        --name "$MONGO_CONTAINER" \
                        --network "$CI_NETWORK" \
                        mongo:7

                    attempt=0
                    until docker exec "$MONGO_CONTAINER" mongosh --quiet \
                        --eval 'db.runCommand({ ping: 1 }).ok' | grep -q 1
                    do
                        attempt=$((attempt + 1))
                        if [ "$attempt" -ge 30 ]; then
                            echo "MongoDB did not become ready"
                            exit 1
                        fi
                        sleep 2
                    done

                    docker exec --interactive "$MONGO_CONTAINER" \
                        mongosh solar-system --quiet < ci/mongo-init.js

                    docker run --rm \
                        --network "$CI_NETWORK" \
                        --env MONGO_URI="mongodb://$MONGO_CONTAINER:27017/solar-system" \
                        --volume "$WORKSPACE:/workspace" \
                        --workdir /workspace \
                        node:22-alpine \
                        sh -c 'npm ci && npm run coverage'
                '''
            }
        }

        stage('Build Image') {
            steps {
                sh 'docker build --pull --tag "$LOCAL_IMAGE" .'
            }
        }

        stage('Smoke Test') {
            steps {
                sh '''
                    set -eu
                    docker run --detach \
                        --name "$APP_CONTAINER" \
                        --network "$CI_NETWORK" \
                        --env MONGO_URI="mongodb://$MONGO_CONTAINER:27017/solar-system" \
                        "$LOCAL_IMAGE"

                    attempt=0
                    until docker run --rm --network "$CI_NETWORK" curlimages/curl:8.12.1 \
                        --fail --silent "http://$APP_CONTAINER:3000/live" | grep -q '"status":"live"'
                    do
                        attempt=$((attempt + 1))
                        if [ "$attempt" -ge 20 ]; then
                            echo "Application smoke test failed"
                            docker logs "$APP_CONTAINER"
                            exit 1
                        fi
                        sleep 2
                    done
                '''
            }
        }

        stage('Publish to Docker Hub') {
            when {
                branch 'main'
            }
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'dockerhub-credentials',
                        usernameVariable: 'DOCKERHUB_USERNAME',
                        passwordVariable: 'DOCKERHUB_TOKEN'
                    )
                ]) {
                    sh '''
                        set -eu
                        IMAGE_REPOSITORY="$DOCKERHUB_USERNAME/$APP_NAME"
                        printf '%s' "$DOCKERHUB_TOKEN" | docker login \
                            --username "$DOCKERHUB_USERNAME" \
                            --password-stdin

                        docker tag "$LOCAL_IMAGE" "$IMAGE_REPOSITORY:$IMAGE_TAG"
                        docker tag "$LOCAL_IMAGE" "$IMAGE_REPOSITORY:latest"
                        docker push "$IMAGE_REPOSITORY:$IMAGE_TAG"
                        docker push "$IMAGE_REPOSITORY:latest"
                    '''
                }
            }
        }
    }

    post {
        always {
            sh '''
                docker logout >/dev/null 2>&1 || true
                docker rm --force "$APP_CONTAINER" >/dev/null 2>&1 || true
                docker rm --force "$MONGO_CONTAINER" >/dev/null 2>&1 || true
                docker network rm "$CI_NETWORK" >/dev/null 2>&1 || true
                if [ -n "${LOCAL_IMAGE:-}" ]; then
                    docker image rm "$LOCAL_IMAGE" >/dev/null 2>&1 || true
                fi
            '''
            deleteDir()
        }
    }
}
