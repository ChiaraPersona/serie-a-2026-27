const {createApiFootballProvider}=require("./api-football"),{createFileProvider}=require("./file"),{createEspnProvider}=require("./espn");
function createProvider(config){if(config.provider==="api-football")return createApiFootballProvider(config);if(config.provider==="espn")return createEspnProvider(config);if(config.provider==="file")return createFileProvider(config);throw new Error(`Provider non supportato: ${config.provider}. Valori: api-football, espn, file.`)}
module.exports={createProvider};
