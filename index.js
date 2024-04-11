import express from "express";
import bodyParser from "body-parser";
import { dirname } from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import generatePDF from "./controllers/userController.js";
import session from "express-session";
import ejs from "ejs";
import puppeteer from "puppeteer";
import path from "path";
import pg from "pg";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
const port = 3000;
const app = express();
const saltRounds = 10;

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: "SECRETKEY",
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

//DATABASE CONNECTIVITY
const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "cvmaker",
  password: "GArv@1234",
  port: 5432,
});
db.connect();

app.get("/", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("index.ejs");
  } else {
    res.redirect("/login");
  }
});

app.get("/templates", (req, res) => {
  res.render("templates.ejs");
});

app.get("/form1", (req, res) => {
  res.render("form1.ejs");
});

app.get("/form2", (req, res) => {
  res.render("form2.ejs");
});

app.get("/form3", (req, res) => {
  res.render("form3.ejs");
});

app.get("/form4", (req, res) => {
  res.render("form4.ejs");
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
});

app.get("/resume4", (req, res) => {
  res.render("template4");
});

app.post("/register", async (req, res) => {
  const email = req.body.username;
  const password = req.body.password;

  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (checkResult.rows.length > 0) {
      res.render("login.ejs", { message: "Email already exists" });
    } else {
      //hashing the password and saving it in the database
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
        } else {
          const result = await db.query(
            "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
            [email, hash]
          );
          const user = result.rows[0];
          req.login(user, (err) => {
            console.log(err);
            res.redirect("/");
          });
        }
      });
    }
  } catch (err) {
    console.log(err);
  }
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
  })
);

app.post("/resume1", upload.single("profileImage"), async (req, res) => {
  try {
    const personalinfo = {
      fname: req.body.fname,
      lname: req.body.lname,
      city: req.body.city,
      country: req.body.country,
      email: req.body.email,
      phone: req.body.phone,
    };

    const profileImage = req.file ? req.file.buffer.toString("base64") : null;

    const experience = [
      {
        company: {
          name: req.body.company1,
          title: req.body.title1,
          role: req.body.role1,
          startDate: req.body.startDate1,
          endDate: req.body.endDate1,
        },
      },
      req.body.company2
        ? {
            company: {
              name: req.body.company2,
              title: req.body.title2,
              role: req.body.role2,
              startDate: req.body.startDate2,
              endDate: req.body.endDate2,
            },
          }
        : null,
    ];

    const education = [
      {
        institute: req.body.institute1,
        qualification: req.body.qualification1,
        startYear: new Date(req.body.startYear1).getFullYear(),
        endYear: new Date(req.body.endYear1).getFullYear(),
        percentage: req.body.percentage1,
      },
      {
        institute: req.body.institute2,
        qualification: req.body.qualification2,
        startYear: new Date(req.body.startYear2).getFullYear(),
        endYear: new Date(req.body.endYear2).getFullYear(),
        percentage: req.body.percentage2,
      },
      {
        institute: req.body.institute3,
        qualification: req.body.qualification3,
        startYear: new Date(req.body.startYear3).getFullYear(),
        endYear: new Date(req.body.endYear3).getFullYear(),
        percentage: req.body.percentage3,
      },
    ];

    const skills = [
      {
        skill: req.body.skill1,
      },
      req.body.skill2 ? { skill: req.body.skill2 } : null,
      req.body.skill3 ? { skill: req.body.skill3 } : null,
      req.body.skill4 ? { skill: req.body.skill4 } : null,
      req.body.skill5 ? { skill: req.body.skill5 } : null,
    ];

    const summary = req.body.summary;

    const projects = [
      {
        projectName: req.body.projectName1,
        projectDescription: req.body.projectDescription1,
      },
      req.body.projectName2
        ? {
            projectName: req.body.projectName2,
            projectDescription: req.body.projectDescription2,
          }
        : null,
      req.body.projectName3
        ? {
            projectName: req.body.projectName3,
            projectDescription: req.body.projectDescription3,
          }
        : null,
    ];

    const accomplishments = [
      {
        accomplishment: req.body.accomplishment1,
      },
      req.body.accomplishment2
        ? { accomplishment: req.body.accomplishment2 }
        : null,
      req.body.accomplishment3
        ? { accomplishment: req.body.accomplishment3 }
        : null,
      req.body.accomplishment4
        ? { accomplishment: req.body.accomplishment4 }
        : null,
      req.body.accomplishment5
        ? { accomplishment: req.body.accomplishment5 }
        : null,
    ];

    const html = await ejs.renderFile(
      path.join(__dirname, "./views/template1.ejs"),
      {
        personalinfo,
        profileImage,
        experience,
        education,
        skills,
        projects,
        accomplishments,
        summary,
      }
    );

    // Generate PDF
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.setViewport({ width: 1920, height: 700 });
    await page.setContent(html, { waitUntil: "networkidle0" });

    await page.evaluateHandle("document.fonts.ready");

    // Path to store the generated PDF
    const pdfPath = path.join(
      __dirname,
      "./public/files",
      `resume_${Date.now()}.pdf`
    );

    // Generate PDF and save to file
    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    // Send the generated PDF as a response
    res.sendFile(pdfPath);
  } catch (error) {
    console.error(error);
  }
});

app.post("/resume4", upload.single("profileImage"), async (req, res) => {
  try {
    const personalinfo = {
      fname: req.body.fname,
      lname: req.body.lname,
      city: req.body.city,
      country: req.body.country,
      email: req.body.email,
      phone: req.body.phone,
    };

    const profileImage = req.file ? req.file.buffer.toString("base64") : null;

    const experience = [
      {
        company: {
          name: req.body.company1,
          title: req.body.title1,
          role: req.body.role1,
          startDate: new Date(req.body.startDate2).getFullYear(),
          endDate: new Date(req.body.endDate2).getFullYear(),
        },
      },
      req.body.company2
        ? {
            company: {
              name: req.body.company2,
              title: req.body.title2,
              role: req.body.role2,
              startDate: new Date(req.body.startDate2).getFullYear(),
              endDate: new Date(req.body.endDate2).getFullYear(),
            },
          }
        : null,
    ];

    const education = [
      {
        institute: req.body.institute1,
        qualification: req.body.qualification1,
        startYear: new Date(req.body.startYear1).getFullYear(),
        endYear: new Date(req.body.endYear1).getFullYear(),
        percentage: req.body.percentage1,
      },
      {
        institute: req.body.institute2,
        qualification: req.body.qualification2,
        startYear: new Date(req.body.startYear2).getFullYear(),
        endYear: new Date(req.body.endYear2).getFullYear(),
        percentage: req.body.percentage2,
      },
      {
        institute: req.body.institute3,
        qualification: req.body.qualification3,
        startYear: new Date(req.body.startYear3).getFullYear(),
        endYear: new Date(req.body.endYear3).getFullYear(),
        percentage: req.body.percentage3,
      },
    ];

    const skills = [
      {
        skill: req.body.skill1,
      },
      req.body.skill2 ? { skill: req.body.skill2 } : null,
      req.body.skill3 ? { skill: req.body.skill3 } : null,
      req.body.skill4 ? { skill: req.body.skill4 } : null,
      req.body.skill5 ? { skill: req.body.skill5 } : null,
    ];

    const summary = req.body.summary;

    const projects = [
      {
        projectName: req.body.projectName1,
        projectDescription: req.body.projectDescription1,
      },
      req.body.projectName2
        ? {
            projectName: req.body.projectName2,
            projectDescription: req.body.projectDescription2,
          }
        : null,
      req.body.projectName3
        ? {
            projectName: req.body.projectName3,
            projectDescription: req.body.projectDescription3,
          }
        : null,
    ];

    const accomplishments = [
      {
        accomplishment: req.body.accomplishment1,
      },
      req.body.accomplishment2
        ? { accomplishment: req.body.accomplishment2 }
        : null,
      req.body.accomplishment3
        ? { accomplishment: req.body.accomplishment3 }
        : null,
      req.body.accomplishment4
        ? { accomplishment: req.body.accomplishment4 }
        : null,
      req.body.accomplishment5
        ? { accomplishment: req.body.accomplishment5 }
        : null,
    ];

    const html = await ejs.renderFile(
      path.join(__dirname, "./views/template4.ejs"),
      {
        personalinfo,
        profileImage,
        experience,
        education,
        skills,
        projects,
        accomplishments,
        summary,
      }
    );

    // Generate PDF
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.setViewport({ width: 1920, height: 700 });
    await page.setContent(html, { waitUntil: "networkidle0" });

    await page.evaluateHandle("document.fonts.ready");

    // Path to store the generated PDF
    const pdfPath = path.join(
      __dirname,
      "./public/files",
      `resume_${Date.now()}.pdf`
    );

    // Generate PDF and save to file
    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    // Send the generated PDF as a response
    res.sendFile(pdfPath);
  } catch (error) {
    console.error(error);
  }
});

app.post("/resume2", upload.single("profileImage"), async (req, res) => {
  try {
    const personalinfo = {
      fname: req.body.fname,
      lname: req.body.lname,
      city: req.body.city,
      country: req.body.country,
      email: req.body.email,
      phone: req.body.phone,
    };

    const profileImage = req.file ? req.file.buffer.toString("base64") : null;

    const experience = [
      {
        company: {
          name: req.body.company1,
          title: req.body.title1,
          role: req.body.role1,
          startDate: req.body.startDate1,
          endDate: req.body.endDate1,
        },
      },
      req.body.company2
        ? {
            company: {
              name: req.body.company2,
              title: req.body.title2,
              role: req.body.role2,
              startDate: req.body.startDate2,
              endDate: req.body.endDate2,
            },
          }
        : null,
    ];

    const education = [
      {
        institute: req.body.institute1,
        qualification: req.body.qualification1,
        startYear: new Date(req.body.startYear1).getFullYear(),
        endYear: new Date(req.body.endYear1).getFullYear(),
        percentage: req.body.percentage1,
      },
      {
        institute: req.body.institute2,
        qualification: req.body.qualification2,
        startYear: new Date(req.body.startYear2).getFullYear(),
        endYear: new Date(req.body.endYear2).getFullYear(),
        percentage: req.body.percentage2,
      },
      {
        institute: req.body.institute3,
        qualification: req.body.qualification3,
        startYear: new Date(req.body.startYear3).getFullYear(),
        endYear: new Date(req.body.endYear3).getFullYear(),
        percentage: req.body.percentage3,
      },
    ];

    const skills = [
      {
        skill: req.body.skill1,
      },
      req.body.skill2 ? { skill: req.body.skill2 } : null,
      req.body.skill3 ? { skill: req.body.skill3 } : null,
      req.body.skill4 ? { skill: req.body.skill4 } : null,
      req.body.skill5 ? { skill: req.body.skill5 } : null,
    ];

    const summary = req.body.summary;

    const projects = [
      {
        projectName: req.body.projectName1,
        projectDescription: req.body.projectDescription1,
      },
      req.body.projectName2
        ? {
            projectName: req.body.projectName2,
            projectDescription: req.body.projectDescription2,
          }
        : null,
      req.body.projectName3
        ? {
            projectName: req.body.projectName3,
            projectDescription: req.body.projectDescription3,
          }
        : null,
    ];

    const accomplishments = [
      {
        accomplishment: req.body.accomplishment1,
      },
      req.body.accomplishment2
        ? { accomplishment: req.body.accomplishment2 }
        : null,
      req.body.accomplishment3
        ? { accomplishment: req.body.accomplishment3 }
        : null,
      req.body.accomplishment4
        ? { accomplishment: req.body.accomplishment4 }
        : null,
      req.body.accomplishment5
        ? { accomplishment: req.body.accomplishment5 }
        : null,
    ];

    const html = await ejs.renderFile(
      path.join(__dirname, "./views/template2.ejs"),
      {
        personalinfo,
        profileImage,
        experience,
        education,
        skills,
        projects,
        accomplishments,
        summary,
      }
    );

    // Generate PDF
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.setViewport({ width: 1920, height: 700 });
    await page.setContent(html, { waitUntil: "networkidle0" });

    await page.evaluateHandle("document.fonts.ready");

    // Path to store the generated PDF
    const pdfPath = path.join(
      __dirname,
      "./public/files",
      `resume_${Date.now()}.pdf`
    );

    // Generate PDF and save to file
    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    // Send the generated PDF as a response
    res.sendFile(pdfPath);
  } catch (error) {
    console.error(error);
  }
});

app.post("/resume3", upload.single("profileImage"), async (req, res) => {
  try {
    const personalinfo = {
      fname: req.body.fname,
      lname: req.body.lname,
      city: req.body.city,
      country: req.body.country,
      email: req.body.email,
      phone: req.body.phone,
    };

    const profileImage = req.file ? req.file.buffer.toString("base64") : null;

    const experience = [
      {
        company: {
          name: req.body.company1,
          title: req.body.title1,
          role: req.body.role1,
          startDate: req.body.startDate1,
          endDate: req.body.endDate1,
        },
      },
      req.body.company2
        ? {
            company: {
              name: req.body.company2,
              title: req.body.title2,
              role: req.body.role2,
              startDate: req.body.startDate2,
              endDate: req.body.endDate2,
            },
          }
        : null,
    ];

    const education = [
      {
        institute: req.body.institute1,
        qualification: req.body.qualification1,
        startYear: new Date(req.body.startYear1).getFullYear(),
        endYear: new Date(req.body.endYear1).getFullYear(),
        percentage: req.body.percentage1,
      },
      {
        institute: req.body.institute2,
        qualification: req.body.qualification2,
        startYear: new Date(req.body.startYear2).getFullYear(),
        endYear: new Date(req.body.endYear2).getFullYear(),
        percentage: req.body.percentage2,
      },
      {
        institute: req.body.institute3,
        qualification: req.body.qualification3,
        startYear: new Date(req.body.startYear3).getFullYear(),
        endYear: new Date(req.body.endYear3).getFullYear(),
        percentage: req.body.percentage3,
      },
    ];

    const skills = [
      {
        skill: req.body.skill1,
      },
      req.body.skill2 ? { skill: req.body.skill2 } : null,
      req.body.skill3 ? { skill: req.body.skill3 } : null,
      req.body.skill4 ? { skill: req.body.skill4 } : null,
      req.body.skill5 ? { skill: req.body.skill5 } : null,
    ];

    const summary = req.body.summary;

    const projects = [
      {
        projectName: req.body.projectName1,
        projectDescription: req.body.projectDescription1,
      },
      req.body.projectName2
        ? {
            projectName: req.body.projectName2,
            projectDescription: req.body.projectDescription2,
          }
        : null,
      req.body.projectName3
        ? {
            projectName: req.body.projectName3,
            projectDescription: req.body.projectDescription3,
          }
        : null,
    ];

    const accomplishments = [
      {
        accomplishment: req.body.accomplishment1,
      },
      req.body.accomplishment2
        ? { accomplishment: req.body.accomplishment2 }
        : null,
      req.body.accomplishment3
        ? { accomplishment: req.body.accomplishment3 }
        : null,
      req.body.accomplishment4
        ? { accomplishment: req.body.accomplishment4 }
        : null,
      req.body.accomplishment5
        ? { accomplishment: req.body.accomplishment5 }
        : null,
    ];

    const html = await ejs.renderFile(
      path.join(__dirname, "./views/template3.ejs"),
      {
        personalinfo,
        profileImage,
        experience,
        education,
        skills,
        projects,
        accomplishments,
        summary,
      }
    );

    // Generate PDF
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.setViewport({ width: 1920, height: 700 });
    await page.setContent(html, { waitUntil: "networkidle0" });

    await page.evaluateHandle("document.fonts.ready");

    // Path to store the generated PDF
    const pdfPath = path.join(
      __dirname,
      "./public/files",
      `resume_${Date.now()}.pdf`
    );

    // Generate PDF and save to file
    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    // Send the generated PDF as a response
    res.sendFile(pdfPath);
  } catch (error) {
    console.error(error);
  }
});

passport.use(
  new Strategy(async function verify(username, password, cb) {
    try {
      const result = await db.query("SELECT * FROM users WHERE email = $1", [
        username,
      ]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashedPassword = user.password;
        bcrypt.compare(password, storedHashedPassword, (err, result) => {
          if (err) {
            console.error("Error comparing passwords:", err);
            return cb(err);
          } else {
            if (result) {
              return cb(null, user);
            } else {
              return cb(null, false);
            }
          }
        });
      } else {
        return cb("User not found");
      }
    } catch (err) {
      console.log(err);
    }
  })
);

passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((user, cb) => {
  cb(null, user);
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
