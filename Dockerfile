FROM node:18

# Tạo thư mục làm việc
WORKDIR /usr/src/app

# Sao chép package.json và package-lock.json (nếu có)
COPY package*.json ./

# Cài đặt các dependencies
RUN npm install

# Sao chép mã nguồn ứng dụng
COPY . .

# Tạo thư mục để lưu trữ file chuyến đi
RUN mkdir -p /usr/src/app/trips
# Đảm bảo thư mục có quyền ghi
RUN chmod 777 /usr/src/app/trips

# Mở cổng mà ứng dụng sẽ lắng nghe
EXPOSE 5021

# Khởi động ứng dụng
CMD ["node", "server.js"]
