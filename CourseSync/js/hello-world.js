// JavaScript Document
// Wait for PhoneGap to load
document.addEventListener("deviceready", onDeviceReady, false);
//document.addEventListener("deviceready", init, false);
//document.addEventListener("touchstart", function() {}, false);

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
});
    
    }


window.dao =  {

    //syncURL: "../api/employees",
    //syncURL: "http://coenraets.org/offline-sync/api/employees?modifiedSince=2012-03-01%2010:20:56",
    //syncURL: "http://www.birminghamdev1.bham.ac.uk/web_services/Staff.svc/",
    syncURL: "http://www.birmingham.ac.uk/web_services/courseservice.svc/json/courses",

    initialize: function(callback) {
        var self = this;
        this.db = window.openDatabase("syncdemodb", "1.0", "Sync Demo DB", 200000);

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
                    "lastModified VARCHAR(50))";
                tx.executeSql(sql);
            },
            this.txErrorHandler,
            function() {
                log('Table courses successfully CREATED in local SQLite database');
                //callback();
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
                    "INSERT OR REPLACE INTO courses (courseName) " +
                    "VALUES (?)";
                log('Inserting or Updating in local database:');
                var e;
                for (var i = 0; i < l; i++) {
                    e = courses[i];
                    log(e.CourseName);// + ' ' + e.officePhone + ' ' + e.deleted + ' ' + e.lastModified);
                    var params = [e.CourseName];//, e.officePhone, e.deleted, e.lastModified];
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
            $('ul#clusters-listview').empty();    
        //}
        
        for (var i = 0; i < l; i++) {
            var course = courses[i];
            //$('#list').append('<tr>' +
            $('ul#clusters-listview').append('<li><a href="#">' + course.courseName + '</a></li>');//.listview('refresh');
        }
    });
    $('div.span12 ul').listview('refresh');
    //$('ul').listview("refresh");
    //$('ul').listview().trigger("create");
    
}

function log(msg) {
    $('#log').val($('#log').val() + msg + '\n');
}

// PhoneGap is ready

/*
function onDeviceReady() {
    getLocation();
    navigator.splashscreen.hide();
}

function getLocation() {
    myNewFunction();
}
  
function myNewFunction(){
    navigator.geolocation.getCurrentPosition(onGeolocationSuccess, onGeolocationError);
}
*/  

/*

var app = {};
app.db = null;

app.openDb = function() {
    if(window.sqlitePlugin !== undefined) {
        app.db = window.sqlitePlugin.openDatabase("Courses");
    } else {
        // For debugin in simulator fallback to native SQL Lite
        console.log("Use built in SQL Lite");
        app.db = window.openDatabase("Courses", "1.0", "Cordova Demo", 200000);
    }
}
      
app.createTable = function() {
	var db = app.db;
	db.transaction(function(tx) {
		tx.executeSql("CREATE TABLE IF NOT EXISTS courses(ID INTEGER PRIMARY KEY ASC, courseName TEXT, added_on DATETIME, last_modified VARCHAR(50))", []);
	});
}
      
app.addCourse = function(courseText) {
	var db = app.db;
	db.transaction(function(tx) {
		var addedOn = new Date();
		tx.executeSql("INSERT INTO courses(courseName, added_on) VALUES (?,?)",
					  [courseText, addedOn],
					  app.onSuccess,
					  app.onError);
	});
}
      
app.onError = function(tx, e) {
	alert("Error: " + e.message);
} 
      
app.onSuccess = function(tx, r) {
	app.refresh();
}
      
app.deleteCourse = function(id) {
	var db = app.db;
	db.transaction(function(tx) {
		tx.executeSql("DELETE FROM courses WHERE ID=?", [id],
					  app.onSuccess,
					  app.onError);
	});
}

app.refresh = function() {
	var renderCourse = function (row) {
		return "<li>" + "<div class='course-check'></div>" + row.courseName + "<a class='button delete' href='javascript:void(0);'  onclick='app.deleteCourse(" + row.ID + ");'><p class='course-delete'></p></a>" + "<div class='clear'></div>" + "</li>";
	}
    
	var render = function (tx, rs) {
		var rowOutput = "";
		var courseItems = document.getElementById("courseItems");
		for (var i = 0; i < rs.rows.length; i++) {
			rowOutput += renderCourse(rs.rows.item(i));
		}
      
		courseItems.innerHTML = rowOutput;
	}
    
	var db = app.db;
	db.transaction(function(tx) {
		tx.executeSql("SELECT * FROM courses", [], 
					  render, 
					  app.onError);
	});
}
      
function init() {
    navigator.splashscreen.hide();
	app.openDb();
	app.createTable();
	app.refresh();
}
      
function addCourses() {
	var course = document.getElementById("course");
	app.addCourse(course.value);
	course.value = "";
}
*/


