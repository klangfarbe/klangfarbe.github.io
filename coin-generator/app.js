'use strict';

angular.module('cg', ['ui.bootstrap']);
angular.module('cg').controller('MainController', MainController);

MainController.$inject = ['$scope', '$log'];

function MainController($scope, $log) {
	var vm = this;

	vm.coins = [
		{ name: 'gold', url: 'images/coins-10.png', count: 10 },
		{ name: 'silver', url: 'images/coins-5.png', count: 10 },
		{ name: 'bronze', url: 'images/coins-1.png', count: 10 }
	];

	vm.printDoubleSided = true;
	vm.coinDiameter = 22;

	vm.paper = {
		available: [
			{
				name: 'A5',
				id: 'a5',
				width: 148,
				height: 210
			},
			{
				name: 'A4',
				id: 'a4',
				width: 210,
				height: 297
			},
			{
				name: 'A3',
				id: 'a3',
				width: 297,
				height: 420
			},
			{
				name: 'A2',
				id: 'a2',
				width: 420,
				height: 594
			},
			{
				name: 'Letter',
				id: 'letter',
				width: 216,
				height: 279
			},
			{
				name: 'Legal',
				id: 'legal',
				width: 216,
				height: 279
			},
			{
				name: 'Set custom size',
				id: 'custom',
				width: 100,
				height: 100
			},
		],
		selected: undefined,
		margins: {
			top: 10,
			right: 10,
			bottom: 10,
			left: 10
		}
	};

	vm.page = {
		totalCoins: 0,
		coinsToPrint: 0,
		maxWidth: 0,
		maxHeight: 0,
		maxPerRow: 0,
		maxRowsPerPage: 0,
		maxPerPage: 0,
		required: 0
	};

	vm.paperName = paperName;
	vm.calculatePageSettings = calculatePageSettings;
	vm.createPdf = createPdf;

	activate();

	// ------------------------------------------------------------------------
	// functions
	// ------------------------------------------------------------------------

	function activate() {
		vm.paper.selected = _.find(vm.paper.available, { id: 'a4' });
		vm.calculatePageSettings();

		$scope.$watch('vm.coinDiameter', calculatePageSettings);
		$scope.$watch('vm.printDoubleSided', calculatePageSettings);
		$scope.$watch('vm.paper.selected', calculatePageSettings);
		$scope.$watch('vm.paper.margins.top', calculatePageSettings);
		$scope.$watch('vm.paper.margins.right', calculatePageSettings);
		$scope.$watch('vm.paper.margins.bottom', calculatePageSettings);
		$scope.$watch('vm.paper.margins.left', calculatePageSettings);

		_.forEach(vm.coins, function(c, i) {
			$scope.$watch('vm.coins[' + i + '].count', calculatePageSettings);
			getDataUri(c);
		});

		var customPaperIndex = _.findIndex(vm.paper.available, { id: 'custom' });
		$scope.$watch('vm.paper.available[' + customPaperIndex + '].width', calculatePageSettings);
		$scope.$watch('vm.paper.available[' + customPaperIndex + '].height', calculatePageSettings);
	}

	function paperName(p) {
		if(!p) {
			p = vm.paper.selected;
		}
		if(p.id === 'custom') {
			return p.name;
		}
		return p.name + ' (' + p.width + 'mm x ' + p.height + 'mm)';
	}

	function calculatePageSettings() {
		vm.page.totalCoins = _.sumBy(vm.coins, 'count');
		vm.page.coinsToPrint = vm.page.totalCoins * (vm.printDoubleSided ? 2 : 1);
		vm.page.maxWidth = vm.paper.selected.width - vm.paper.margins.left - vm.paper.margins.right;
		vm.page.maxHeight = vm.paper.selected.height - vm.paper.margins.top - vm.paper.margins.bottom;
		vm.page.maxPerRow = Math.floor(vm.page.maxWidth / vm.coinDiameter);
		vm.page.maxRowsPerPage = Math.floor(vm.page.maxHeight / vm.coinDiameter);
		vm.page.maxPerPage = vm.page.maxPerRow * vm.page.maxRowsPerPage;
		vm.page.required = Math.ceil(vm.page.totalCoins / vm.page.maxPerPage) * (vm.printDoubleSided ? 2 : 1);
	}

	var pages = [];
	var currentPage = undefined;

	function getSettingsAsString(delimiter) {
		var items = [
			"coins=" + vm.page.totalCoins,
			"diameter=" + vm.coinDiameter + 'mm',
			"doubleSided=" + vm.printDoubleSided || false
		];
		_.forEach(vm.coins, function(c) { items.push(c.name + '=' + c.count)});

		return items.join(delimiter || ' ');
	}

	function createPdf() {
		vm.calculatePageSettings();

		_.forEach(vm.coins, function(coin) {
			for(var i = 0; i < coin.count; i++) {
				addCoinToPage(coin.data);
			}
		});

		// value to center the elements on the page
		var offsetX = (vm.paper.selected.width - vm.page.maxPerRow * vm.coinDiameter) / 2;
		var offsetY = (vm.paper.selected.height - vm.page.maxRowsPerPage * vm.coinDiameter) / 2;

		// create pdf - delete page 1 first because it is added automatically
		// with the new and correct paper size
		var pdf = new jsPDF('p', 'mm');
		pdf.deletePage(1);

		_.forEach(pages, function(page, pageNumber) {
			// create front page
			createPage(pdf, page, 'Front ' + (pageNumber + 1) + ' - ' + getSettingsAsString(),
				offsetX, offsetY - 5,
				function(idx) {return offsetX + idx * vm.coinDiameter},
				function(idx) {return offsetY + idx * vm.coinDiameter});

			// create back page
			if(vm.printDoubleSided) {
				createPage(pdf, page, 'Back ' + (pageNumber + 1) + ' - ' + getSettingsAsString(),
					offsetX, offsetY - 5,
					function(idx) {return vm.paper.selected.width - offsetX - (idx + 1) * vm.coinDiameter},
					function(idx) {return offsetY + idx * vm.coinDiameter});
			}
		});
        pdf.save('coin_generator_' + getSettingsAsString('_') + '.pdf');

        // clear data
		pages = [];
        currentPage = undefined;
	}

	function createPage(pdf, page, pageName, pageNameX, pageNameY, getX, getY) {
		pdf.addPage(vm.paper.selected.width, vm.paper.selected.height);
		pdf.setFontSize(8);
		pdf.text(pageNameX, pageNameY, pageName);

		_.forEach(page.rows, function(row, a) {
			_.forEach(row, function(img, b) {
				pdf.addImage(img, 'PNG', getX(b), getY(a), vm.coinDiameter, vm.coinDiameter)
			});
		});
	}

	function addCoinToPage(img) {
		if(_.isUndefined(currentPage) || currentPage.coins == vm.page.maxPerPage) {
			currentPage = {
				rows: [
					[]
				],
				coins: 0
			};
			pages.push(currentPage);
		}

		currentPage.coins++;

		if(_.last(currentPage.rows).length == vm.page.maxPerRow) {
			currentPage.rows.push([]);
		}
		_.last(currentPage.rows).push(img);
	}

	function getDataUri(img) {
		var image = new Image();
		image.onload = function () {
			var canvas = document.createElement('canvas');
			canvas.width = this.naturalWidth;
			canvas.height = this.naturalHeight;
			canvas.getContext('2d').drawImage(this, 0, 0);
			img.data = canvas.toDataURL('image/png')
		};
		image.src = img.url;
	}
}
