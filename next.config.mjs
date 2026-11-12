const nextConfig = {
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "drive.google.com",
				pathname: "/uc",
			},
		],
	},
};

export default nextConfig;
