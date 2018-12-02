var person = {
    firstName: 'meimei',
    lastName: 'han'
};
Object.defineProperty(person, 'fullName', {
    get() {
        return this.lastName + ' ' + this.firstName;
    },
    set(val) {
        let arr = val.split(' ');
        this.lastName = arr[0];
        this.firstName = arr[1];
    }
});
