const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const handlers = require("./handlers");

const PROTO_PATH = path.join(__dirname, "../proto/xml_service.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const xmlservice = protoDescriptor.xmlservice;

function getServer() {
  const server = new grpc.Server();
  server.addService(xmlservice.XmlService.service, handlers);
  return server;
}

function start() {
  const server = getServer();
  const addr = process.env.GRPC_ADDR || "0.0.0.0:50051";
  server.bindAsync(addr, grpc.ServerCredentials.createInsecure(), () => {
    console.log(`[gRPC] Server listening on ${addr}`);
    server.start();
  });
}

if (require.main === module) {
  start();
}

module.exports = { start };
