module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    'download-atom-shell': {
      version: '0.19.0',
      outputDir: './build/atom-shell',
      rebuild: true
    },

    'clean': {
      options: {
        force: true
      },
      src: [
        './build/atom-shell/Atom.app/Contents/Resources/app',
        './dist/*'
      ]
    },

    'copy': {
      build: {
        expand: true,
        cwd: './ocupado-app',
        src: ['**'],
        dest: './build/atom-shell/Atom.app/Contents/Resources/app'
      }
    },

    'shell': {
      start: {
        command: function(debug) {
          if (debug) {
            return './build/atom-shell/Atom.app/Contents/MacOS/Atom --debug-brk ./ocupado-app'
          } else {
            return './build/atom-shell/Atom.app/Contents/MacOS/Atom ./ocupado-app';
          }
        }
      },
      dist: {
        command: [
          'mkdir -p ./dist',
          'cp -R ./build/atom-shell ./dist/ocupado/',
          'mv ./dist/ocupado/Atom.app ./dist/ocupado/Ocupado.app',
          'cp ./dist/ocupado/Ocupado.app/Contents/Resources/app/assets/atom.icns ./dist/ocupado/Ocupado.app/Contents/Resources',
          'plist=`pwd`/dist/ocupado/Ocupado.app/Contents/Info.plist',
          'defaults write $plist CFBundleDisplayName Ocupado',
          'defaults write $plist CFBundleName Ocupado',
          'plutil -convert xml1 $plist',
          'rm -f ./dist/ocupado/LICENSE ./dist/ocupado/version',
        ].join('&&')
      }
    }
  });

  grunt.loadNpmTasks('grunt-download-atom-shell');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-shell');

  grunt.registerTask('start', ['clean', 'shell:start']);
  grunt.registerTask('debug', ['clean', 'shell:start:debug']);

  grunt.registerTask('build', ['download-atom-shell', 'clean', 'copy:build']);
  grunt.registerTask('dist', ['build', 'shell:dist']);

  grunt.registerTask('default', ['build']);
};
