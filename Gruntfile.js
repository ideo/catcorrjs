module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        jshint: {
            files: ['Gruntfile.js'],
            jshintrc: '.jshintrc'
        },
        jscs: {
            // src: ['Gruntfile.js'], 'src/**.js'],
            src: ['Gruntfile.js'],
            options: {
                config: '.jscsrc'
            }
        },
        uglify: {
            options: {
                banner: (
                    '/*! <%= pkg.name %> ' +
                    '<%= grunt.template.today("yyyy-mm-dd") %> */\n'
                )
            },
            build: {
                src: 'src/<%= pkg.name %>.js',
                dest: 'build/<%= pkg.name %>.min.js'
            }
        },
        watch: {
            files: ['<%= jshint.files %>'],
            tasks: ['jshint', 'jscs']
        }
    });

    // Load the plugins
    grunt.loadNpmTasks('grunt-contrib-compass');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-jscs');

    // Default task(s).
    grunt.registerTask('default', [
        'jshint',
        'jscs',
        // 'compass',
        // 'concat',
        'uglify'
    ]);

};
