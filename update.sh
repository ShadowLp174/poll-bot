git checkout .
branch=$(git branch --show-current)
git pull origin $branch
npm install
cp current-config.json ./config.json
node command-deployer.js
