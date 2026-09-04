set -e

git pull 
npm install
npm run build
docker cp dist/client/. nginx:/home/dev/code/course-schedule/