const fs=require("fs");
function createFileProvider(config){if(!config.fileSource)throw new Error("REFEREE_STATS_FILE_SOURCE mancante per il provider file.");const document=JSON.parse(fs.readFileSync(config.fileSource,"utf8"));return {id:"file",async listFixtures({competitionId,limit}){return {sourceUrl:config.fileSource,fixtures:(document[competitionId]||[]).slice(0,limit)}},async fetchFixtureBundle(fixture){return fixture.bundle||fixture}}}
module.exports={createFileProvider};
