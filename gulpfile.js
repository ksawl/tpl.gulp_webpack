/** Requires */
let { src, dest } = require("gulp"),
    fs = require("fs"),
    gulp = require("gulp"),
    browsersync = require("browser-sync").create(),
    fileinclude = require("gulp-file-include"),
    del = require("del"),
    scss = require("gulp-sass"),
    autoprefixer = require("gulp-autoprefixer"),
    group_media = require("gulp-group-css-media-queries"),
    clean_css = require("gulp-clean-css"),
    rename = require("gulp-rename"),
    uglify = require("gulp-uglify-es").default,
    /** webp = require("gulp-webp"), // Not Work on windows < 10 */
    /* webphtml = require("gulp-webp-html"), */
    /* webpcss = require("gulp-webpcss"), */
    imagemin = require("gulp-imagemin"),
    ttf2woff = require("gulp-ttf2woff"),
    ttf2woff2 = require("gulp-ttf2woff2"),
    fonter = require("gulp-fonter"),
    webpack = require("webpack-stream"),
    vinylnamed = require("vinyl-named"),
    argv = require("yargs").argv;

/** Configs */
let isProd = argv.production,
    isDev = !isProd;

let project_folder = isProd ? "../gh-pages" : "dest";
let source_folder = "#src";

let path = {
    build: {
        html: project_folder + "/",
        css: project_folder + "/css/",
        js: project_folder + "/js/",
        img: project_folder + "/img/",
        fonts: project_folder + "/fonts/",
        static: project_folder + "/static/",
        legacy: project_folder + "/legacy/",
        vendor: project_folder + "/vendor/",
    },
    src: {
        html: [source_folder + "/*.html", "!" + source_folder + "/_*.html"],
        css: [
            source_folder + "/scss/*.scss",
            "!" + source_folder + "/scss/_*.scss",
        ],
        js: [source_folder + "/js/*.js", "!" + source_folder + "/js/_*.js"],
        img: source_folder + "/img/**/*.{jpg,png,svg,gif,ico,webp}",
        fonts: source_folder + "/fonts/*.ttf",
        vendor: source_folder + "/vendor/**/*.*",
        static: source_folder + "/.static/**/*.*",
        legacy: source_folder + "/.legacy/**/*.*",
    },
    watch: {
        html: source_folder + "/**/*.html",
        css: source_folder + "/scss/**/*.scss",
        js: source_folder + "/js/**/*.js",
        img: source_folder + "/img/**/*.{jpg,png,svg,gif,ico,webp}",
    },
    /* clean: "./" + project_folder + "/", */
    clean: [project_folder + "/**/*", "!" + project_folder + "/.git/"],
};

/** Tasks */
function static() {
    return src(path.src.static).pipe(dest(path.build.static));
}

function legacy() {
    return src(path.src.legacy).pipe(dest(path.build.legacy));
}

function vendor() {
    return src(path.src.vendor).pipe(dest(path.build.vendor));
}
function html() {
    return (
        src(path.src.html)
            .pipe(fileinclude())
            /** .pipe(webphtml()) */
            .pipe(dest(path.build.html))
            .pipe(browsersync.stream())
    );
}

function css() {
    return (
        src(path.src.css)
            .pipe(
                scss({
                    outputStyle: "expanded",
                })
            )
            .pipe(group_media())
            .pipe(
                autoprefixer({
                    overrideBrowserslist: ["last 5 versions"],
                    cascade: true,
                    grid: true,
                })
            )
            /* .pipe(webpcss()) */
            .pipe(dest(path.build.css))
            .pipe(clean_css())
            .pipe(
                rename({
                    extname: ".min.css",
                })
            )
            .pipe(dest(path.build.css))
            .pipe(browsersync.stream())
    );
}

let webpackConfig = {
    mode: isDev ? "development" : "production",
    devtool: isDev ? "eval-source-map" : "none",
    output: {
        filename: "[name].js",
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: "/node_modules",
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: ["@babel/preset-env"],
                        plugins: ["@babel/plugin-proposal-class-properties"],
                    },
                },
            },
        ],
    },
};

function js() {
    return (
        src(path.src.js)
            .pipe(vinylnamed())
            .pipe(webpack(webpackConfig))
            /* .pipe(fileinclude())
        .pipe(dest(path.build.js))
            .pipe(uglify()) */
            .pipe(
                rename({
                    extname: ".min.js",
                })
            )
            .pipe(dest(path.build.js))
            .pipe(browsersync.stream())
    );
}

function images() {
    return (
        src(path.src.img)
            /** .pipe(
            webp({
                quality: 70,
            })
        )
        .pipe(dest(path.build.img))
        .pipe(src(path.src.img)) // use gulp-webp */
            .pipe(
                imagemin({
                    progressive: true,
                    svgoPlugins: [{ removeViewBox: false }],
                    interlaced: true,
                    optimizationLevel: 3,
                })
            )
            .pipe(dest(path.build.img))
            .pipe(browsersync.stream())
    );
}

function fonts() {
    src(path.src.fonts).pipe(ttf2woff()).pipe(dest(path.build.fonts));
    return src(path.src.fonts).pipe(ttf2woff2()).pipe(dest(path.build.fonts));
}

gulp.task("otf2ttf", function () {
    return src([source_folder + "/fonts/*.otf"])
        .pipe(fonter({ formats: ["ttf"] }))
        .pipe(dest(source_folder + "/fonts/"));
});

gulp.task("eot2ttf", function () {
    return src([source_folder + "/fonts/*.eot"])
        .pipe(fonter({ formats: ["ttf"] }))
        .pipe(dest(source_folder + "/fonts/"));
});

function fontsStyle(done) {
    let file_content = fs.readFileSync(source_folder + "/scss/_fonts.scss");
    if (file_content == "") {
        fs.writeFile(source_folder + "/scss/_fonts.scss", "", cb);
        return fs.readdir(path.build.fonts, function (err, items) {
            if (items) {
                let c_fontname;
                for (var i = 0; i < items.length; i++) {
                    let fontname = items[i].split(".");
                    fontname = fontname[0];
                    if (c_fontname != fontname) {
                        fs.appendFile(
                            source_folder + "/scss/_fonts.scss",
                            '@include font("' +
                                fontname +
                                '", "' +
                                fontname +
                                '", "400", "normal");\r\n',
                            cb
                        );
                    }
                    c_fontname = fontname;
                }
            }

            done();
        });
    }

    return done();
}

function cb() {}

function browserSync() {
    browsersync.init({
        server: {
            baseDir: "./" + project_folder + "/",
        },
        port: 3000,
        notify: false,
    });
}

function watchFiles() {
    gulp.watch([path.watch.html], html);
    gulp.watch([path.watch.css], css);
    gulp.watch([path.watch.js], js);
    gulp.watch([path.watch.img], images);
}

function clean() {
    return del(path.clean, { force: true });
}

let build = gulp.series(
    clean,
    gulp.parallel(js, css, html, images, fonts, static, legacy, vendor),
    fontsStyle
);
let watch = gulp.parallel(build, watchFiles, browserSync);

exports.legacy = legacy;
exports.static = static;
exports.fontsStyle = fontsStyle;
exports.fonts = fonts;
exports.images = images;
exports.js = js;
exports.css = css;
exports.html = html;
exports.build = build;
exports.watch = watch;
exports.default = watch;
