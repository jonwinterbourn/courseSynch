
document.addEventListener("deviceready", onDeviceReady, false);


function onDeviceReady() {
    
    $('#reset').on('click', function() {
        dao.dropTable(function() {
           dao.createTable();
        });
    });

    $('#sync').on('click', function() {
        dao.sync(renderList);
    });
    
    $('#render').on('click', function() {
        renderList();
    });
    
    $('#clearLog').on('click', function() {
        $('#log').val('');
        //log.empty();
    });
        
    $('ul#courses-listview').on("click", 'li', function(event){
            
            id = $(this).attr("id");
            renderCourseDetail(id);
    });
        
}
    

window.dao =  {

    syncURL: "http://www.birmingham.ac.uk/web_services/courseservice.svc/json/courses",

    initialize: function(callback) {
        var self = this;
        this.db = window.openDatabase("syncdemodb", "1.0", "Sync Demo DB", 2000000);

        // Testing if the table exists is not needed and is here for logging purpose only. We can invoke createTable
        // no matter what. The 'IF NOT EXISTS' clause will make sure the CREATE statement is issued only if the table
        // does not already exist.
        this.db.transaction(
            function(tx) {
                tx.executeSql("SELECT name FROM sqlite_master WHERE type='table' AND name='courses'", this.txErrorHandler,
                    function(tx, results) {
                        if (results.rows.length == 1) {
                            log('Using existing Courses table in local SQLite database');
                        }
                        else
                        {
                            log('Courses table does not exist in local SQLite database');
                            self.createTable(callback);
                        }
                    });
            }
        )

    },
        
    createTable: function(callback) {
        this.db.transaction(
            function(tx) {
                var sql =
                    "CREATE TABLE IF NOT EXISTS courses ( " +
                    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                    "courseName VARCHAR(150), " +
                    "bannerCode INTEGER, " +
                    "registryCode VARCHAR(20), " +
                    "ucasCode VARCHAR(10), " +
                    "contentId INTEGER, " +
                    "courseSummary TEXT, " +
                    "lastModified VARCHAR(50))";
                tx.executeSql(sql);
            },
            this.txErrorHandler,
            function() {
                log('Table courses successfully CREATED in local SQLite database');
                callback();
            }
        );
    },

    dropTable: function(callback) {
        this.db.transaction(
            function(tx) {
                tx.executeSql('DROP TABLE IF EXISTS courses');
            },
            this.txErrorHandler,
            function() {
                log('Table courses successfully DROPPED in local SQLite database');
                callback();
            }
        );
    },

    findAll: function(callback) {
        this.db.transaction(
            function(tx) {
                var sql = "SELECT * FROM COURSES";
                log('Local SQLite database: "SELECT * FROM COURSES"');
                tx.executeSql(sql, this.txErrorHandler,
                    function(tx, results) {
                        var len = results.rows.length,
                            courses = [],
                            i = 0;
                        for (; i < len; i = i + 1) {
                            courses[i] = results.rows.item(i);
                        }
                        log(len + ' rows found');
                        callback(courses);
                    }
                );
            }
        );
    },
    
    find: function(id, callback) {
        this.db.transaction(
            function(tx) {
                var sql = "SELECT * FROM COURSES where id =" +id;
                log('Local SQLite database: "SELECT * FROM COURSES where id = "' + id);
                tx.executeSql(sql, this.txErrorHandler,
                    function(tx, results) {
                        var len = results.rows.length,
                            courses = [],
                            i = 0;
                        for (; i < len; i = i + 1) {
                            courses[i] = results.rows.item(i);
                        }
                        log(len + ' rows found');
                        callback(courses);
                    }
                );
            }
        );
    },

    getLastSync: function(callback) {
        this.db.transaction(
            function(tx) {
                var sql = "SELECT MAX(lastModified) as lastSync FROM courses";
                tx.executeSql(sql, this.txErrorHandler,
                    function(tx, results) {
                        var lastSync = results.rows.item(0).lastSync;
                        log('Last local timestamp is ' + lastSync);
                        callback(lastSync);
                    }
                );
            }
        );
    },

    sync: function(callback) {

        var self = this;
        log('Starting synchronization...');
        this.getLastSync(function(lastSync){
            self.getChanges(self.syncURL, lastSync,
                function (changes) {
                    if (changes.length > 0) {
                        self.applyChanges(changes, callback);
                    } else {
                        log('Nothing to synchronize');
                        callback();
                    }
                }
            );
        });

    },

    getChanges: function(syncURL, modifiedSince, callback) {

        $.ajax({
            url: syncURL,
            data: {modifiedSince: modifiedSince},
            dataType:"json",
            success:function (data) {
                log("The server returned " + data.length + " changes that occurred after " + modifiedSince);
                callback(data);
            },
            error: function(model, response) {
                alert(response.responseText);
            }
        });

    },

    applyChanges: function(courses, callback) {
        this.db.transaction(
            function(tx) {
                var l = courses.length;
                var sql =
                    "INSERT OR REPLACE INTO courses (courseName, contentId, courseSummary, bannerCode) " +
                    "VALUES (?, ?, ?, ?)";
                log('Inserting or Updating in local database:');
                var e;
                for (var i = 0; i < l; i++) {
                    e = courses[i];
                    log(e.CourseName + ' ' + e.ContentId);// + ' ' + e.deleted + ' ' + e.lastModified);
                    var params = [e.CourseName, e.ContentId, e.CourseSummary, e.BannerCode];//, e.officePhone, e.deleted, e.lastModified];
                    tx.executeSql(sql, params);
                }
                log('Synchronization complete (' + l + ' items synchronized)');
            },
            this.txErrorHandler,
            function(tx) {
                callback();
            }
        );
    },

    txErrorHandler: function(tx) {
        alert(tx.message);
    }
};

dao.initialize(function() {
    console.log('database initialized');
});




function renderList(courses) {
    log('Rendering list using local SQLite data...');
    dao.findAll(function(courses) {
        $('#list').empty();
        var l = courses.length;
        //if (l>0) {
            //remove list items
            $('ul#courses-listview').empty(); 
            $('ul#courses-listview').append('<li data-role="list-divider">Courses</li>');
        //}
        
        for (var i = 0; i < l; i++) {
            var course = courses[i];
            //$('#list').append('<tr>' +
            $('ul#courses-listview').append('<li id="' + course.id + '"><a href="#courseDetail">' + course.courseName + ' (' + course.contentId + ')' + '</a></li>');
        }
    
    $('div.span12 ul#courses-listview').listview('refresh');
    });
    
}




function renderCourseDetail(id) {
    dao.find(id, function(courses) {
        var course = courses[0];
        $('#courseDetail-title').text(course.courseName);
        $('#courseDetail-summary').html(course.courseSummary);
        //if (e.bannerCode !=null) {
            $('#courseDetail-bannerCode').html('<span class="field-title">Banner Code: </span>' + course.bannerCode);
        //}
        
    })
	
};

function log(msg) {
    $('#log').val($('#log').val() + msg + '\n');
}


