const fs = require("fs");
const http = require("http");
const Koa = require("koa");
const { koaBody } = require("koa-body");
const koaStatic = require("koa-static");
const path = require("path");
const uuid = require("uuid");

const app = new Koa();

const public = path.join(__dirname, "/public");

app.use(koaStatic(public));

app.use(
  koaBody({
    urlencoded: true,
    multipart: true,
  })
);

app.use((ctx, next) => {
  const origin = ctx.request.get("Origin");
  if (!origin) {
    return next();
  }

  const headers = { "Access-Control-Allow-Origin": "*" };

  if (ctx.request.method !== "OPTIONS") {
    ctx.response.set({ ...headers });
    try {
      return next();
    } catch (e) {
      e.headers = { ...e.headers, ...headers };
      throw e;
    }
  }

  if (ctx.request.get("Access-Control-Request-Method")) {
    ctx.response.set({
      ...headers,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH",
    });

    if (ctx.request.get("Access-Control-Request-Headers")) {
      ctx.response.set("Access-Control-Allow-Headers", ctx.request.get("Access-Control-Request-Headers"));
    }

    ctx.response.status = 204;
  }
});

const posts = [];

app.use((ctx, next) => {
  if (ctx.request.method !== "GET") {
    next();

    return;
  }

  ctx.response.body = JSON.stringify(posts);

  next();
});

app.use((ctx, next) => {
  if (ctx.request.method !== "POST") {
    next();

    return;
  }

  console.log(ctx.request.body);

  //if filtering
  if (Object.keys(ctx.request.body).indexOf("filterName") > -1) {
    const { filterName, filterValue } = ctx.request.body;

    let filteredPosts;
    if (filterName === "content") {
      filteredPosts = posts.filter((item) => item[filterName].includes(filterValue));
    } else {
      filteredPosts = posts.filter((item) => item[filterName] === filterValue);
    }
    console.log(filteredPosts);

    ctx.response.set("Access-Control-Allow-Origin", "*");
    ctx.response.body = JSON.stringify(filteredPosts);

    next();

    return;
  }

  //if adding new post
  const { id, content, date, type } = ctx.request.body;
  posts.push({ id, content, date, type });

  ctx.response.set("Access-Control-Allow-Origin", "*");
  ctx.response.body = JSON.stringify(posts);

  next();
});

app.use(async (ctx, next) => {
  if (ctx.request.method !== "PUT") {
    next();

    return;
  }

  console.log(ctx.request.body);
  console.log(ctx.request.files);

  let fileName;

  try {
    const public = path.join(__dirname, "/public");

    const { file } = ctx.request.files;

    const subfolder = uuid.v4();

    const uploadFolder = public + "/" + subfolder;
    console.log(uploadFolder);

    console.log(fs.existsSync(public));
    if (!fs.existsSync(public)) {
      console.log("111");
      fs.mkdirSync(public);
    }

    fs.mkdirSync(uploadFolder);
    console.log("dir created");

    fs.copyFileSync(file.filepath, uploadFolder + "/" + file.newFilename);
    console.log("file saved");

    fileName = "/" + subfolder + "/" + file.newFilename;
  } catch (error) {
    console.log(error);
    ctx.response.status = 500;

    return;
  }

  ctx.response.body = JSON.stringify(fileName);

  next();

  return;
});

const port = process.env.PORT || 3000;
const server = http.createServer(app.callback());
server.listen(port, (err) => {
  if (err) {
    console.log(err);

    return;
  }

  console.log("Server is listening to " + port);
});
